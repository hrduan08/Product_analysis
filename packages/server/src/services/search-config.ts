import { addDays, isAfter } from 'date-fns';
import { format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { createHttpError } from '../utils/http-error.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  filterEnabledProviderPlatforms,
  getEnabledProviderPlatforms,
  getSelectableSearchPlatforms
} from '../config/platforms.js';
import type { Platform } from '../types/search.js';
import { getTierLimitsByStatus } from '../config/search-limits.js';
import { buildFeishuTextPayload, sendFeishuWebhookMessage } from './feishu.js';

const DEFAULT_PLATFORMS: string[] = ['youtube'];
const SUPPORTED_SELECTION_PLATFORMS = ['youtube', 'reddit', 'x', 'facebook'] as const;
const MAX_KEYWORDS = 3;
const MAX_SLOTS = 3;
const DEFAULT_TIMEZONE = 'Asia/Shanghai';
const SLOT_JITTER_SECONDS = Math.max(Number(process.env.USER_SEARCH_SLOT_JITTER ?? '30'), 0);

export const SEARCH_CONFIG_DEFAULT_TIMEZONE = DEFAULT_TIMEZONE;

const slotRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const patchSchema = z
  .object({
    platforms: z
      .array(z.enum(SUPPORTED_SELECTION_PLATFORMS))
      .min(1)
      .max(SUPPORTED_SELECTION_PLATFORMS.length)
      .optional(),
    keywords: z
      .array(z.string().trim().min(2, '关键词至少 2 个字符').max(60, '关键词长度请控制在 60 字内'))
      .max(MAX_KEYWORDS)
      .optional(),
    slots: z
      .array(z.string().refine((value) => slotRegex.test(value), '时间格式必须为 HH:mm'))
      .max(MAX_SLOTS)
      .optional(),
    notifyEmail: z.string().email().optional(),
    timezone: z.string().min(2).max(60).optional(),
    notifyChannels: z
      .array(z.enum(['email', 'feishu'] as const))
      .min(1)
      .max(2)
      .optional(),
    feishuWebhook: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) =>
          value === undefined ||
          value === '' ||
          value.startsWith('https://open.feishu.cn/open-apis/bot/'),
        '请填写以 https://open.feishu.cn/open-apis/bot/ 开头的 Webhook URL'
      )
  })
  .strict();

export type SearchConfigPatchInput = z.input<typeof patchSchema>;

export type UserSearchConfigRecord = {
  userId: string;
  platforms: string[];
  keywords: string[];
  slots: string[];
  notifyEmail: string;
  timezone: string;
  notifyChannels: string[];
  feishuWebhook: string;
  feishuStatus: string | null;
  feishuLastTestedAt: Date | null;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  lastNotifiedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  limits: {
    maxKeywords: number;
    maxSlots: number;
  };
};

type FeishuStatus = 'ok' | 'failed';

export function getSelectablePlatforms(): string[] {
  return getSelectableSearchPlatforms();
}

export function getSupportedProviderPlatforms(platforms: string[]): Platform[] {
  return filterEnabledProviderPlatforms(platforms);
}

export async function getUserSearchConfig(userId: string): Promise<UserSearchConfigRecord> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      status: true,
      searchConfig: true
    }
  });

  if (!user) {
    throw createHttpError(401, '用户不存在或已注销，请重新登录');
  }

  const tierLimits = getTierLimitsByStatus(user.status as Prisma.UserStatus);

  if (!user.searchConfig) {
    return {
      userId,
      platforms: [...DEFAULT_PLATFORMS],
      keywords: [],
      slots: [],
      notifyEmail: user.email,
      timezone: DEFAULT_TIMEZONE,
      notifyChannels: ['feishu'],
      feishuWebhook: '',
      feishuStatus: null,
      feishuLastTestedAt: null,
      nextRunAt: null,
      lastRunAt: null,
      lastNotifiedAt: null,
      createdAt: null,
      updatedAt: null,
      limits: {
        maxKeywords: tierLimits.maxKeywords,
        maxSlots: tierLimits.maxSlots
      }
    };
  }

  const record = user.searchConfig;
  const keywords = clampList(record.keywords, tierLimits.maxKeywords);
  const slots = clampList(record.slots, tierLimits.maxSlots);
  return mapRecordToDto(
    {
      ...record,
      keywords,
      slots
    },
    tierLimits
  );
}

export async function updateUserSearchConfig(
  userId: string,
  input: SearchConfigPatchInput
): Promise<UserSearchConfigRecord> {
  const payload = patchSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, status: true, searchConfig: true }
  });

  if (!user) {
    throw createHttpError(401, '用户不存在或已注销，请重新登录');
  }

  const existing = user.searchConfig;
  const tierLimits = getTierLimitsByStatus(user.status as Prisma.UserStatus);

  if (tierLimits.maxKeywords === 0 || tierLimits.maxSlots === 0) {
    throw createHttpError(403, '当前账号未开通定时搜索功能，请升级套餐后再试');
  }

  if (payload.keywords && countDistinctKeywords(payload.keywords) > tierLimits.maxKeywords) {
    throw createHttpError(400, `当前套餐最多支持 ${tierLimits.maxKeywords} 个关键词`);
  }

  if (payload.slots && payload.slots.length > tierLimits.maxSlots) {
    throw createHttpError(400, `当前套餐最多支持 ${tierLimits.maxSlots} 个执行时间`);
  }

  const platforms = normalizePlatforms(payload.platforms ?? existing?.platforms ?? DEFAULT_PLATFORMS);
  const keywords = normalizeKeywords(payload.keywords ?? existing?.keywords ?? [], tierLimits.maxKeywords);
  const rawSlots = payload.slots ?? existing?.slots ?? [];
  const slots = normalizeSlots(rawSlots, tierLimits.maxSlots);
  const timezone = payload.timezone ?? existing?.timezone ?? DEFAULT_TIMEZONE;
  const notifyEmail = payload.notifyEmail ?? existing?.notify_email ?? user.email;
  const notifyChannels = normalizeNotifyChannels(payload.notifyChannels ?? existing?.notify_channels ?? ['feishu']);
  const webhookInput =
    payload.feishuWebhook !== undefined
      ? payload.feishuWebhook.trim()
      : existing?.feishu_webhook ?? '';
  const feishuWebhook = webhookInput;

  const shouldResetSchedule =
    !existing ||
    payload.slots !== undefined ||
    (payload.timezone !== undefined && payload.timezone !== existing?.timezone);

  const webhookChanged = payload.feishuWebhook !== undefined && payload.feishuWebhook !== existing?.feishu_webhook;

  const nextRunAt = computeNextRunAt(
    slots,
    timezone,
    shouldResetSchedule ? null : existing?.next_run_at ?? undefined
  );

  const record = await prisma.userSearchConfig.upsert({
    where: { user_id: userId },
    update: {
      platforms,
      keywords,
      slots,
      notify_email: notifyEmail,
      timezone,
      notify_channels: notifyChannels,
      feishu_webhook: feishuWebhook || null,
      feishu_status: webhookChanged ? null : existing?.feishu_status ?? null,
      feishu_last_tested_at: webhookChanged ? null : existing?.feishu_last_tested_at ?? null,
      next_run_at: nextRunAt,
      updated_at: new Date()
    },
    create: {
      user_id: userId,
      platforms,
      keywords,
      slots,
      notify_email: notifyEmail,
      timezone,
      notify_channels: notifyChannels,
      feishu_webhook: feishuWebhook || null,
      next_run_at: nextRunAt
    }
  });

  return mapRecordToDto(record, tierLimits);
}

type DueSearchConfig = Prisma.UserSearchConfigGetPayload<{
  select: {
    user_id: true;
    platforms: true;
    keywords: true;
    slots: true;
    notify_email: true;
    timezone: true;
    notify_channels: true;
    feishu_webhook: true;
    feishu_status: true;
    next_run_at: true;
    last_run_at: true;
    last_notified_at: true;
    user: {
      select: {
      email: true;
      status: true;
      };
    };
  };
}>;

export async function listDueUserSearchConfigs(reference: Date): Promise<DueSearchConfig[]> {
  return prisma.userSearchConfig.findMany({
    where: {
      next_run_at: {
        lte: reference
      },
      user: {
        status: {
          in: ['trialing', 'active'] as Prisma.UserStatus[]
        }
      }
    },
    select: {
      user_id: true,
      platforms: true,
      keywords: true,
      slots: true,
      notify_email: true,
      timezone: true,
      notify_channels: true,
      feishu_webhook: true,
      feishu_status: true,
      next_run_at: true,
      last_run_at: true,
      last_notified_at: true,
      user: {
        select: {
          email: true,
          status: true
        }
      }
    }
  });
}

export async function updateExecutionMetadata(params: {
  userId: string;
  nextRunAt: Date | null;
  lastRunAt: Date;
  lastNotifiedAt: Date | null;
}): Promise<void> {
  await prisma.userSearchConfig.update({
    where: { user_id: params.userId },
    data: {
      next_run_at: params.nextRunAt,
      last_run_at: params.lastRunAt,
      last_notified_at: params.lastNotifiedAt
    }
  });
}

function normalizePlatforms(source: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const platform of source) {
    const value = platform.toLowerCase();
    if (!SUPPORTED_SELECTION_PLATFORMS.includes(value as (typeof SUPPORTED_SELECTION_PLATFORMS)[number])) {
      continue;
    }
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  const filtered = filterEnabledProviderPlatforms(result);
  if (filtered.length === 0) {
    return [...DEFAULT_PLATFORMS];
  }
  return filtered;
}

function normalizeKeywords(source: string[], limit = MAX_KEYWORDS): string[] {
  if (limit <= 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const keyword of source) {
    const trimmed = keyword.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
}

function normalizeSlots(source: string[], limit = MAX_SLOTS): string[] {
  if (limit <= 0) return [];
  const seen = new Set<string>();
  const normalized = source
    .map((item) => item.trim())
    .filter((item) => slotRegex.test(item))
    .map((item) => {
      const [hour, minute] = item.split(':');
      return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    })
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    })
    .sort();
  return normalized.slice(0, limit);
}

export function computeNextRunAt(
  slots: string[],
  timezone: string,
  previous?: Date | null
): Date | null {
  if (!slots.length) {
    return null;
  }

  const now = new Date();
  const base = previous && isAfter(previous, now) ? previous : now;
  const zonedBase = toZonedTime(base, timezone);
  const today = format(zonedBase, 'yyyy-MM-dd');

  const sortedSlots = [...slots].sort();

  for (const slot of sortedSlots) {
    const candidate = fromZonedTime(`${today}T${slot}:00`, timezone);
    if (candidate > now) {
      return applyJitter(candidate, SLOT_JITTER_SECONDS);
    }
  }

  const nextDay = addDays(zonedBase, 1);
  const nextDayString = format(nextDay, 'yyyy-MM-dd');
  return applyJitter(fromZonedTime(`${nextDayString}T${sortedSlots[0]}:00`, timezone), SLOT_JITTER_SECONDS);
}

function mapRecordToDto(
  record: {
  user_id: string;
  platforms: string[];
  keywords: string[];
  slots: string[];
  notify_email: string;
  timezone: string;
  notify_channels: string[];
  feishu_webhook: string | null;
  feishu_status: string | null;
  feishu_last_tested_at: Date | null;
  next_run_at: Date | null;
  last_run_at: Date | null;
  last_notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
},
  limits?: { maxKeywords: number; maxSlots: number }
): UserSearchConfigRecord {
  const safePlatforms = filterEnabledProviderPlatforms(record.platforms);
  return {
    userId: record.user_id,
    platforms: safePlatforms.length > 0 ? [...safePlatforms] : [...DEFAULT_PLATFORMS],
    keywords: [...record.keywords],
    slots: [...record.slots],
    notifyEmail: record.notify_email,
    timezone: record.timezone,
    notifyChannels: record.notify_channels && record.notify_channels.length > 0 ? [...record.notify_channels] : ['feishu'],
    feishuWebhook: record.feishu_webhook ?? '',
    feishuStatus: record.feishu_status,
    feishuLastTestedAt: record.feishu_last_tested_at,
    nextRunAt: record.next_run_at,
    lastRunAt: record.last_run_at,
    lastNotifiedAt: record.last_notified_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    limits: limits ?? { maxKeywords: MAX_KEYWORDS, maxSlots: MAX_SLOTS }
  };
}

function clampList<T>(source: T[], limit: number): T[] {
  if (limit <= 0) {
    return [];
  }
  if (source.length <= limit) {
    return [...source];
  }
  return source.slice(0, limit);
}

function countDistinctKeywords(values: string[]): number {
  const seen = new Set<string>();
  for (const item of values) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    seen.add(trimmed.toLowerCase());
  }
  return seen.size;
}

function applyJitter(date: Date, maxSeconds: number): Date {
  if (maxSeconds <= 0) {
    return date;
  }
  const jitterSeconds = Math.floor(Math.random() * (maxSeconds + 1));
  if (jitterSeconds === 0) {
    return date;
  }
  return new Date(date.getTime() + jitterSeconds * 1000);
}

function normalizeNotifyChannels(values: string[]): string[] {
  const allowed = new Set<'email' | 'feishu'>(['email', 'feishu']);
  const result: string[] = [];
  for (const value of values) {
    if (!allowed.has(value as 'email' | 'feishu')) continue;
    if (!result.includes(value)) {
      result.push(value);
    }
  }
  if (result.length === 0) {
    return ['feishu'];
  }
  return result;
}

export async function testFeishuChannel(userId: string): Promise<{ status: FeishuStatus; testedAt: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });
  if (!user) {
    throw createHttpError(401, '用户不存在或已注销，请重新登录');
  }
  const config = await prisma.userSearchConfig.findUnique({
    where: { user_id: userId },
    select: { feishu_webhook: true }
  });
  const webhook = config?.feishu_webhook ?? null;
  if (!webhook) {
    throw createHttpError(400, '请先在搜索配置中填写飞书 Webhook，再执行测试');
  }

  const testedAt = new Date();
  const text = [
    '【Product Insight】飞书通知测试',
    `账号：${user.email}`,
    `时间：${format(testedAt, 'yyyy-MM-dd HH:mm:ss')}`,
    '',
    '如无需飞书提醒，可在搜索配置控制台中修改通知方式。'
  ].join('\n');

  try {
    await sendFeishuWebhookMessage({
      webhook,
      payload: buildFeishuTextPayload(text)
    });
    await updateFeishuChannelStatus(userId, { status: 'ok', testedAt });
    return { status: 'ok', testedAt };
  } catch (error) {
    await updateFeishuChannelStatus(userId, { status: 'failed', testedAt }).catch(() => undefined);
    const message = error instanceof Error ? error.message : '飞书通知测试失败，请稍后再试';
    throw createHttpError(502, message);
  }
}

export async function updateFeishuChannelStatus(
  userId: string,
  params: { status: FeishuStatus; testedAt?: Date }
): Promise<void> {
  try {
    await prisma.userSearchConfig.update({
      where: { user_id: userId },
      data: {
        feishu_status: params.status,
        feishu_last_tested_at: params.testedAt ?? new Date()
      }
    });
  } catch (error) {
    console.warn(`[search-config] 更新飞书状态失败 user=${userId}`, error);
  }
}
