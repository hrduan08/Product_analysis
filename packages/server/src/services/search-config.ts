import { format } from 'date-fns';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { createHttpError } from '../utils/http-error.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  filterEnabledProviderPlatforms,
  getSelectableSearchPlatforms,
  isRedditBetaUserAllowed
} from '../config/platforms.js';
import type { Platform } from '../types/search.js';
import { getTierLimitsByStatus } from '../config/search-limits.js';
import { buildFeishuTextPayload, sendFeishuWebhookMessage } from './feishu.js';
import { generateAndPersistProductProfile } from './product-profile.js';

type ProductTargetDto = {
  name: string;
  coreFeatures: string[];
};

const DEFAULT_PLATFORMS: string[] = ['youtube'];
const SUPPORTED_SELECTION_PLATFORMS = ['youtube', 'reddit', 'x', 'facebook'] as const;
const MAX_REDDIT_COMMUNITIES = 3;
const MAX_REDDIT_KEYWORDS = 2;
const MAX_YOUTUBE_KEYWORDS = 2;
const DEFAULT_TIMEZONE = 'Asia/Shanghai';
const AUTO_SCHEDULE_JITTER_SECONDS = Math.max(Number(process.env.USER_SEARCH_AUTO_JITTER_SECONDS ?? '3600'), 0);
export const USER_SEARCH_REDDIT_INTERVAL_MINUTES = Math.max(
  Number(process.env.USER_SEARCH_REDDIT_INTERVAL_MINUTES ?? '720'),
  1
);
export const USER_SEARCH_YOUTUBE_INTERVAL_MINUTES = Math.max(
  Number(process.env.USER_SEARCH_YOUTUBE_INTERVAL_MINUTES ?? '1440'),
  1
);
export const USER_SEARCH_REDDIT_INTERVAL_MS = USER_SEARCH_REDDIT_INTERVAL_MINUTES * 60 * 1000;
export const USER_SEARCH_YOUTUBE_INTERVAL_MS = USER_SEARCH_YOUTUBE_INTERVAL_MINUTES * 60 * 1000;
const AUTO_SOON_MIN_SECONDS = Math.max(
  Number(process.env.USER_SEARCH_AUTO_SOON_MIN_SECONDS ?? '30'),
  0
);
const AUTO_SOON_MAX_SECONDS = Math.max(
  Number(process.env.USER_SEARCH_AUTO_SOON_MAX_SECONDS ?? '180'),
  AUTO_SOON_MIN_SECONDS
);

export const SEARCH_CONFIG_DEFAULT_TIMEZONE = DEFAULT_TIMEZONE;

const redditCommunityNameRegex = /^[A-Za-z0-9_]{2,32}$/;

const patchSchema = z
  .object({
    platforms: z
      .array(z.enum(SUPPORTED_SELECTION_PLATFORMS))
      .min(1)
      .max(SUPPORTED_SELECTION_PLATFORMS.length)
      .optional(),
    redditCommunities: z.array(z.string().trim().min(2).max(200)).max(MAX_REDDIT_COMMUNITIES).optional(),
    redditKeywords: z
      .array(z.string().trim().min(2, '关键词至少 2 个字符').max(60, '关键词长度请控制在 60 字内'))
      .max(MAX_REDDIT_KEYWORDS)
      .optional(),
    youtubeKeywords: z
      .array(z.string().trim().min(2, '关键词至少 2 个字符').max(60, '关键词长度请控制在 60 字内'))
      .max(MAX_YOUTUBE_KEYWORDS)
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
      ),
    productWebsiteUrl: z.string().trim().url('官网链接格式不正确').optional().or(z.literal('')),
    productCommerceUrl: z.string().trim().url('电商链接格式不正确').optional().or(z.literal('')),
    productDescription: z.string().trim().max(5000, '产品介绍请控制在 5000 字内').optional(),
    productProfile: z
      .object({
        brand: z.string().trim().max(120).optional(),
        productName: z.string().trim().max(200).optional(),
        category: z.string().trim().max(120).optional(),
        coreFeatures: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
        targetProducts: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(200),
              coreFeatures: z.array(z.string().trim().min(1).max(120)).max(20).optional()
            })
          )
          .max(20)
          .optional()
      })
      .optional()
  })
  .strict();

export type SearchConfigPatchInput = z.input<typeof patchSchema>;

export type UserSearchConfigRecord = {
  userId: string;
  platforms: string[];
  redditCommunities: string[];
  redditKeywords: string[];
  youtubeKeywords: string[];
  notifyEmail: string;
  timezone: string;
  productWebsiteUrl: string;
  productCommerceUrl: string;
  productDescription: string;
    productProfile: {
      status: string;
      error: string | null;
      generatedAt: Date | null;
      updatedByUser: boolean;
      brand: string;
      productName: string;
      category: string;
      coreFeatures: string[];
      targetProducts: ProductTargetDto[];
    };
  notifyChannels: string[];
  feishuWebhook: string;
  feishuStatus: string | null;
  feishuLastTestedAt: Date | null;
  nextRunAt: Date | null;
  redditLastRunAt: Date | null;
  youtubeLastRunAt: Date | null;
  lastNotifiedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  limits: {
    maxRedditCommunities: number;
    maxRedditKeywords: number;
    maxYoutubeKeywords: number;
  };
  meta: {
    redditBetaAllowed: boolean;
  };
};

type FeishuStatus = 'ok' | 'failed';

export function getSelectablePlatforms(): string[] {
  return getSelectableSearchPlatforms();
}

export function getSupportedProviderPlatforms(platforms: string[]): Platform[] {
  return filterEnabledProviderPlatforms(platforms);
}

export function getSupportedProviderPlatformsForUser(
  platforms: string[],
  userEmail: string | null | undefined
): Platform[] {
  return filterEnabledProviderPlatforms(platforms, {
    userEmail,
    enforceRedditWhitelist: true
  });
}

export function canUseRedditBeta(email: string | null | undefined): boolean {
  return isRedditBetaUserAllowed(email);
}

export function resolveRedditCommunityName(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const rIndex = parts.findIndex((item) => item.toLowerCase() === 'r');
    if (rIndex >= 0 && parts[rIndex + 1]) {
      const name = parts[rIndex + 1].trim();
      return redditCommunityNameRegex.test(name) ? name : null;
    }
  } catch {
    // not URL, fallback to short patterns
  }

  const shortMatched = trimmed.match(/^r\/([A-Za-z0-9_]{2,32})$/i);
  if (shortMatched?.[1]) {
    return shortMatched[1];
  }

  return redditCommunityNameRegex.test(trimmed) ? trimmed : null;
}

function normalizeRedditCommunityUrl(input: string): string | null {
  const name = resolveRedditCommunityName(input);
  if (!name) {
    return null;
  }
  return `https://www.reddit.com/r/${name}/`;
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
  const redditBetaAllowed = canUseRedditBeta(user.email);

  if (!user.searchConfig) {
    return {
      userId,
      platforms: [...DEFAULT_PLATFORMS],
      redditCommunities: [],
      redditKeywords: [],
      youtubeKeywords: [],
      notifyEmail: user.email,
      timezone: DEFAULT_TIMEZONE,
      productWebsiteUrl: '',
      productCommerceUrl: '',
      productDescription: '',
      productProfile: {
        status: 'idle',
        error: null,
        generatedAt: null,
        updatedByUser: false,
        brand: '',
        productName: '',
        category: '',
        coreFeatures: [],
        targetProducts: []
      },
      notifyChannels: ['feishu'],
      feishuWebhook: '',
      feishuStatus: null,
      feishuLastTestedAt: null,
      nextRunAt: null,
      redditLastRunAt: null,
      youtubeLastRunAt: null,
      lastNotifiedAt: null,
      createdAt: null,
      updatedAt: null,
      limits: {
        maxRedditCommunities: tierLimits.maxRedditCommunities,
        maxRedditKeywords: tierLimits.maxRedditKeywords,
        maxYoutubeKeywords: tierLimits.maxYoutubeKeywords
      },
      meta: {
        redditBetaAllowed
      }
    };
  }

  const record = user.searchConfig;
  return mapRecordToDto(record, {
    maxRedditCommunities: tierLimits.maxRedditCommunities,
    maxRedditKeywords: tierLimits.maxRedditKeywords,
    maxYoutubeKeywords: tierLimits.maxYoutubeKeywords
  }, {
    redditBetaAllowed,
    userEmail: user.email
  });
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
  const redditBetaAllowed = canUseRedditBeta(user.email);

  if (tierLimits.maxRedditCommunities === 0 && tierLimits.maxYoutubeKeywords === 0) {
    throw createHttpError(403, '当前账号未开通定时搜索功能，请升级套餐后再试');
  }

  const requestedReddit =
    payload.platforms?.includes('reddit') ||
    (payload.redditCommunities !== undefined && payload.redditCommunities.length > 0) ||
    (payload.redditKeywords !== undefined && payload.redditKeywords.length > 0);
  if (requestedReddit && !redditBetaAllowed) {
    throw createHttpError(403, 'Reddit Beta 功能暂未开放，如需试用请联系 VoiceInsight 团队');
  }

  if (
    payload.youtubeKeywords &&
    countDistinctKeywords(payload.youtubeKeywords) > tierLimits.maxYoutubeKeywords
  ) {
    throw createHttpError(400, `当前套餐最多支持 ${tierLimits.maxYoutubeKeywords} 个 YouTube 关键词`);
  }

  if (
    payload.redditKeywords &&
    countDistinctKeywords(payload.redditKeywords) > tierLimits.maxRedditKeywords
  ) {
    throw createHttpError(400, `当前套餐最多支持 ${tierLimits.maxRedditKeywords} 个 Reddit 关键词`);
  }

  if (
    payload.redditCommunities &&
    countDistinctRedditCommunities(payload.redditCommunities) > tierLimits.maxRedditCommunities
  ) {
    throw createHttpError(400, `当前套餐最多支持 ${tierLimits.maxRedditCommunities} 个 Reddit 社区`);
  }

  const platforms = normalizePlatforms(payload.platforms ?? existing?.platforms ?? DEFAULT_PLATFORMS, {
    userEmail: user.email,
    enforceRedditWhitelist: true
  });
  const redditCommunities = normalizeRedditCommunities(
    payload.redditCommunities ?? existing?.reddit_communities ?? [],
    tierLimits.maxRedditCommunities
  );
  const redditKeywords = normalizeKeywords(
    payload.redditKeywords ?? existing?.reddit_keywords ?? [],
    tierLimits.maxRedditKeywords
  );
  const youtubeKeywords = normalizeKeywords(
    payload.youtubeKeywords ?? existing?.youtube_keywords ?? [],
    tierLimits.maxYoutubeKeywords
  );

  const timezone = payload.timezone ?? existing?.timezone ?? DEFAULT_TIMEZONE;
  const notifyEmail = payload.notifyEmail ?? existing?.notify_email ?? user.email;
  const notifyChannels = normalizeNotifyChannels(payload.notifyChannels ?? existing?.notify_channels ?? ['feishu']);
  const productWebsiteUrl =
    payload.productWebsiteUrl !== undefined
      ? payload.productWebsiteUrl.trim()
      : existing?.product_website_url ?? '';
  const productCommerceUrl =
    payload.productCommerceUrl !== undefined
      ? payload.productCommerceUrl.trim()
      : existing?.product_commerce_url ?? '';
  const productDescription =
    payload.productDescription !== undefined
      ? payload.productDescription.trim()
      : existing?.product_description ?? '';
  const manualProfile = payload.productProfile
    ? normalizeProductProfileInput(payload.productProfile)
    : null;
  const webhookInput =
    payload.feishuWebhook !== undefined
      ? payload.feishuWebhook.trim()
      : existing?.feishu_webhook ?? '';
  const feishuWebhook = webhookInput;

  const effectiveRedditCommunities = platforms.includes('reddit') ? redditCommunities : [];
  const effectiveRedditKeywords = platforms.includes('reddit') ? redditKeywords : [];
  const effectiveYoutubeKeywords = platforms.includes('youtube') ? youtubeKeywords : [];

  const webhookChanged =
    payload.feishuWebhook !== undefined && payload.feishuWebhook !== existing?.feishu_webhook;

  const configChangedForSchedule =
    !existing ||
    payload.platforms !== undefined ||
    payload.redditCommunities !== undefined ||
    payload.redditKeywords !== undefined ||
    payload.youtubeKeywords !== undefined;
  const productInputsChanged =
    !existing ||
    payload.productWebsiteUrl !== undefined ||
    payload.productCommerceUrl !== undefined ||
    payload.productDescription !== undefined;

  const nextRunAt = computeNextAutoRunAt({
    platforms,
    redditCommunities: effectiveRedditCommunities,
    redditKeywords: effectiveRedditKeywords,
    youtubeKeywords: effectiveYoutubeKeywords,
    redditLastRunAt: existing?.reddit_last_run_at ?? null,
    youtubeLastRunAt: existing?.youtube_last_run_at ?? null,
    forceSoon: configChangedForSchedule
  });

  const record = await prisma.userSearchConfig.upsert({
    where: { user_id: userId },
    update: {
      platforms,
      reddit_communities: effectiveRedditCommunities,
      reddit_keywords: effectiveRedditKeywords,
      youtube_keywords: effectiveYoutubeKeywords,
      notify_email: notifyEmail,
      timezone,
      product_website_url: productWebsiteUrl || null,
      product_commerce_url: productCommerceUrl || null,
      product_description: productDescription || null,
      product_profile_brand: manualProfile?.brand ?? existing?.product_profile_brand ?? null,
      product_profile_product_name:
        manualProfile?.productName ?? existing?.product_profile_product_name ?? null,
      product_profile_category: manualProfile?.category ?? existing?.product_profile_category ?? null,
      product_profile_core_features:
        manualProfile?.coreFeatures ?? existing?.product_profile_core_features ?? [],
      product_profile_targets:
        manualProfile?.targetProducts && manualProfile.targetProducts.length > 0
          ? manualProfile.targetProducts
          : manualProfile
            ? Prisma.JsonNull
            : normalizeProductProfileTargets(existing?.product_profile_targets),
      product_profile_competitors: [],
      product_profile_status:
        manualProfile
          ? 'ready'
          : productInputsChanged
            ? 'pending'
            : existing?.product_profile_status ?? 'idle',
      product_profile_error: manualProfile ? null : productInputsChanged ? null : existing?.product_profile_error ?? null,
      product_profile_generated_at: manualProfile
        ? new Date()
        : productInputsChanged
          ? null
          : existing?.product_profile_generated_at ?? null,
      product_profile_updated_by_user: manualProfile ? true : productInputsChanged ? false : existing?.product_profile_updated_by_user ?? false,
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
      reddit_communities: effectiveRedditCommunities,
      reddit_keywords: effectiveRedditKeywords,
      youtube_keywords: effectiveYoutubeKeywords,
      notify_email: notifyEmail,
      timezone,
      product_website_url: productWebsiteUrl || null,
      product_commerce_url: productCommerceUrl || null,
      product_description: productDescription || null,
      product_profile_brand: manualProfile?.brand ?? null,
      product_profile_product_name: manualProfile?.productName ?? null,
      product_profile_category: manualProfile?.category ?? null,
      product_profile_core_features: manualProfile?.coreFeatures ?? [],
      product_profile_targets:
        manualProfile?.targetProducts && manualProfile.targetProducts.length > 0
          ? manualProfile.targetProducts
          : Prisma.JsonNull,
      product_profile_competitors: [],
      product_profile_status: manualProfile ? 'ready' : hasAnyProductSource(productWebsiteUrl, productCommerceUrl, productDescription) ? 'pending' : 'idle',
      product_profile_error: null,
      product_profile_generated_at: manualProfile ? new Date() : null,
      product_profile_updated_by_user: Boolean(manualProfile),
      notify_channels: notifyChannels,
      feishu_webhook: feishuWebhook || null,
      next_run_at: nextRunAt
    }
  });

  const shouldGenerateProfile =
    !manualProfile &&
    hasAnyProductSource(productWebsiteUrl, productCommerceUrl, productDescription) &&
    (productInputsChanged || !hasUsableProductProfile(record));

  const finalRecord = shouldGenerateProfile
    ? await generateAndPersistProductProfile(record.user_id)
    : record;

  return mapRecordToDto(finalRecord, {
    maxRedditCommunities: tierLimits.maxRedditCommunities,
    maxRedditKeywords: tierLimits.maxRedditKeywords,
    maxYoutubeKeywords: tierLimits.maxYoutubeKeywords
  }, {
    redditBetaAllowed,
    userEmail: user.email
  });
}

type DueSearchConfig = Prisma.UserSearchConfigGetPayload<{
  select: {
    user_id: true;
    platforms: true;
    reddit_communities: true;
    reddit_keywords: true;
    youtube_keywords: true;
    notify_email: true;
    timezone: true;
    notify_channels: true;
    feishu_webhook: true;
    feishu_status: true;
    next_run_at: true;
    reddit_last_run_at: true;
    youtube_last_run_at: true;
    last_notified_at: true;
    updated_at: true;
    product_website_url: true;
    product_commerce_url: true;
    product_description: true;
    product_profile_status: true;
    product_profile_error: true;
    product_profile_generated_at: true;
    product_profile_updated_by_user: true;
    product_profile_brand: true;
    product_profile_product_name: true;
    product_profile_category: true;
    product_profile_core_features: true;
    product_profile_targets: true;
    product_profile_competitors: true;
    user: {
      select: {
        email: true;
        status: true;
      };
    };
  };
}>;

export async function listDueUserSearchConfigs(
  reference: Date,
  options: { ignoreNextRunAt?: boolean } = {}
): Promise<DueSearchConfig[]> {
  return prisma.userSearchConfig.findMany({
    where: {
      ...(options.ignoreNextRunAt
        ? {}
        : {
            next_run_at: {
              lte: reference
            }
          }),
      user: {
        status: {
          in: ['trialing', 'active'] as Prisma.UserStatus[]
        }
      }
    },
    select: {
      user_id: true,
      platforms: true,
      reddit_communities: true,
      reddit_keywords: true,
      youtube_keywords: true,
      notify_email: true,
      timezone: true,
      notify_channels: true,
      feishu_webhook: true,
      feishu_status: true,
      next_run_at: true,
      reddit_last_run_at: true,
      youtube_last_run_at: true,
      last_notified_at: true,
      updated_at: true,
      product_website_url: true,
      product_commerce_url: true,
      product_description: true,
      product_profile_status: true,
      product_profile_error: true,
      product_profile_generated_at: true,
      product_profile_updated_by_user: true,
      product_profile_brand: true,
      product_profile_product_name: true,
      product_profile_category: true,
      product_profile_core_features: true,
      product_profile_targets: true,
      product_profile_competitors: true,
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
  lastNotifiedAt: Date | null;
  redditLastRunAt?: Date | null;
  youtubeLastRunAt?: Date | null;
}): Promise<void> {
  const data: Prisma.UserSearchConfigUpdateInput = {
    next_run_at: params.nextRunAt,
    last_notified_at: params.lastNotifiedAt
  };

  if (params.redditLastRunAt !== undefined) {
    data.reddit_last_run_at = params.redditLastRunAt;
  }
  if (params.youtubeLastRunAt !== undefined) {
    data.youtube_last_run_at = params.youtubeLastRunAt;
  }

  await prisma.userSearchConfig.update({
    where: { user_id: params.userId },
    data
  });
}

function normalizePlatforms(
  source: string[],
  options: { userEmail?: string | null; enforceRedditWhitelist?: boolean } = {}
): string[] {
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
  const filtered = filterEnabledProviderPlatforms(result, options);
  if (filtered.length === 0) {
    return [...DEFAULT_PLATFORMS];
  }
  return filtered;
}

function normalizeKeywords(source: string[], limit: number): string[] {
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

function normalizeRedditCommunities(source: string[], limit: number): string[] {
  if (limit <= 0) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of source) {
    const normalized = normalizeRedditCommunityUrl(item);
    if (!normalized) {
      continue;
    }
    const name = resolveRedditCommunityName(normalized);
    if (!name) {
      continue;
    }
    const dedupeKey = name.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

export function computeNextAutoRunAt(params: {
  platforms: string[];
  redditCommunities: string[];
  redditKeywords?: string[];
  youtubeKeywords: string[];
  redditLastRunAt?: Date | null;
  youtubeLastRunAt?: Date | null;
  forceSoon?: boolean;
  now?: Date;
}): Date | null {
  const now = params.now ?? new Date();

  if (params.forceSoon) {
    const offset = randomBetween(AUTO_SOON_MIN_SECONDS, AUTO_SOON_MAX_SECONDS);
    return new Date(now.getTime() + offset * 1000);
  }

  const candidates: Date[] = [];

  if (
    params.platforms.includes('reddit') &&
    params.redditCommunities.length > 0 &&
    (params.redditKeywords?.length ?? 0) > 0
  ) {
    const base = params.redditLastRunAt ?? now;
    candidates.push(
      applyJitter(
        new Date(base.getTime() + USER_SEARCH_REDDIT_INTERVAL_MS),
        AUTO_SCHEDULE_JITTER_SECONDS
      )
    );
  }

  if (params.platforms.includes('youtube') && params.youtubeKeywords.length > 0) {
    const base = params.youtubeLastRunAt ?? now;
    candidates.push(
      applyJitter(
        new Date(base.getTime() + USER_SEARCH_YOUTUBE_INTERVAL_MS),
        AUTO_SCHEDULE_JITTER_SECONDS
      )
    );
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
}

function mapRecordToDto(
  record: {
    user_id: string;
    platforms: string[];
    reddit_communities: string[];
    reddit_keywords: string[];
    youtube_keywords: string[];
    notify_email: string;
    timezone: string;
    product_website_url: string | null;
    product_commerce_url: string | null;
    product_description: string | null;
    product_profile_status: string | null;
    product_profile_error: string | null;
    product_profile_generated_at: Date | null;
    product_profile_updated_by_user: boolean;
    product_profile_brand: string | null;
    product_profile_product_name: string | null;
    product_profile_category: string | null;
    product_profile_core_features: string[];
    product_profile_targets: Prisma.JsonValue | null;
    product_profile_competitors: string[];
    notify_channels: string[];
    feishu_webhook: string | null;
    feishu_status: string | null;
    feishu_last_tested_at: Date | null;
    next_run_at: Date | null;
    reddit_last_run_at: Date | null;
    youtube_last_run_at: Date | null;
    last_notified_at: Date | null;
    created_at: Date;
    updated_at: Date;
  },
  limits: {
    maxRedditCommunities: number;
    maxRedditKeywords: number;
    maxYoutubeKeywords: number;
  },
  options: {
    redditBetaAllowed: boolean;
    userEmail?: string | null;
  }
): UserSearchConfigRecord {
  const safePlatforms = filterEnabledProviderPlatforms(record.platforms, {
    userEmail: options.userEmail,
    enforceRedditWhitelist: true
  });

  const youtubeKeywords = normalizeKeywords(record.youtube_keywords, limits.maxYoutubeKeywords);
  const redditKeywords = normalizeKeywords(record.reddit_keywords, limits.maxRedditKeywords);
  const redditCommunities = normalizeRedditCommunities(
    record.reddit_communities,
    limits.maxRedditCommunities
  );

  return {
    userId: record.user_id,
    platforms: safePlatforms.length > 0 ? [...safePlatforms] : [...DEFAULT_PLATFORMS],
    redditCommunities,
    redditKeywords,
    youtubeKeywords,
    notifyEmail: record.notify_email,
    timezone: record.timezone,
    productWebsiteUrl: record.product_website_url ?? '',
    productCommerceUrl: record.product_commerce_url ?? '',
    productDescription: record.product_description ?? '',
    productProfile: {
      status: record.product_profile_status ?? 'idle',
      error: record.product_profile_error,
      generatedAt: record.product_profile_generated_at,
      updatedByUser: record.product_profile_updated_by_user,
      brand: record.product_profile_brand ?? '',
      productName: record.product_profile_product_name ?? '',
      category: record.product_profile_category ?? '',
      coreFeatures: [...record.product_profile_core_features],
      targetProducts: normalizeProductProfileTargets(record.product_profile_targets)
    },
    notifyChannels:
      record.notify_channels && record.notify_channels.length > 0
        ? [...record.notify_channels]
        : ['feishu'],
    feishuWebhook: record.feishu_webhook ?? '',
    feishuStatus: record.feishu_status,
    feishuLastTestedAt: record.feishu_last_tested_at,
    nextRunAt: record.next_run_at,
    redditLastRunAt: record.reddit_last_run_at,
    youtubeLastRunAt: record.youtube_last_run_at,
    lastNotifiedAt: record.last_notified_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    limits,
    meta: {
      redditBetaAllowed: options.redditBetaAllowed
    }
  };
}

function normalizeProductProfileInput(input: NonNullable<SearchConfigPatchInput['productProfile']>) {
  return {
    brand: input.brand?.trim() ?? '',
    productName: input.productName?.trim() ?? '',
    category: input.category?.trim() ?? '',
    coreFeatures: dedupeTextArray(input.coreFeatures ?? []),
    targetProducts: normalizeIncomingTargetProducts(input.targetProducts ?? [])
  };
}

function normalizeIncomingTargetProducts(values: Array<{ name: string; coreFeatures?: string[] }>): ProductTargetDto[] {
  const seen = new Set<string>();
  const result: ProductTargetDto[] = [];

  for (const value of values) {
    const name = value.name.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      name,
      coreFeatures: dedupeTextArray(value.coreFeatures ?? [])
    });
  }

  return result;
}

function normalizeProductProfileTargets(value: Prisma.JsonValue | null | undefined): ProductTargetDto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: ProductTargetDto[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const rawName = 'name' in item && typeof item.name === 'string' ? item.name : '';
    const name = rawName.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const rawCoreFeatures =
      'coreFeatures' in item && Array.isArray(item.coreFeatures)
        ? item.coreFeatures
        : 'core_features' in item && Array.isArray(item.core_features)
          ? item.core_features
          : [];
    result.push({
      name,
      coreFeatures: dedupeTextArray(rawCoreFeatures.map((feature) => String(feature)))
    });
  }

  return result;
}

function dedupeTextArray(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function hasAnyProductSource(websiteUrl: string, commerceUrl: string, description: string): boolean {
  return Boolean(websiteUrl.trim() || commerceUrl.trim() || description.trim());
}

function hasUsableProductProfile(record: {
  product_profile_brand?: string | null;
  product_profile_product_name?: string | null;
  product_profile_category?: string | null;
  product_profile_core_features?: string[];
  product_profile_targets?: Prisma.JsonValue | null;
  product_profile_competitors?: string[];
}): boolean {
  return Boolean(
    record.product_profile_brand ||
      record.product_profile_product_name ||
      record.product_profile_category ||
      (record.product_profile_core_features?.length ?? 0) > 0 ||
      normalizeProductProfileTargets(record.product_profile_targets).length > 0
  );
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

function countDistinctRedditCommunities(values: string[]): number {
  const seen = new Set<string>();
  for (const item of values) {
    const name = resolveRedditCommunityName(item);
    if (!name) continue;
    seen.add(name.toLowerCase());
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

function randomBetween(min: number, max: number): number {
  if (max <= min) {
    return min;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
