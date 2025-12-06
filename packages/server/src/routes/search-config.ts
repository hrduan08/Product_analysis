import { Router } from 'express';
import { z, ZodError } from 'zod';

import {
  getUserSearchConfig,
  updateUserSearchConfig,
  getSelectablePlatforms,
  SEARCH_CONFIG_DEFAULT_TIMEZONE,
  testFeishuChannel
} from '../services/search-config.js';

const router = Router();

const PLATFORM_OPTIONS = ['youtube', 'reddit', 'x', 'facebook'] as const;

const querySchema = z.object({
  userId: z.string().uuid()
});

const patchSchema = z
  .object({
    userId: z.string().uuid(),
    platforms: z.array(z.enum(PLATFORM_OPTIONS)).optional(),
    keywords: z.array(z.string()).optional(),
    slots: z.array(z.string()).optional(),
    notifyEmail: z.string().optional(),
    timezone: z.string().optional(),
    notifyChannels: z.array(z.enum(['email', 'feishu'] as const)).optional(),
    feishuWebhook: z.string().optional()
  })
  .strict();

const feishuTestSchema = z
  .object({
    userId: z.string().uuid()
  })
  .strict();

router.get('/app/search-config', async (req, res, next) => {
  try {
    const { userId } = querySchema.parse(req.query);
    const config = await getUserSearchConfig(userId);
    res.json({
      config: serializeConfig(config),
      meta: {
        supportedPlatforms: getSelectablePlatforms(),
        maxKeywords: config.limits.maxKeywords,
        maxSlots: config.limits.maxSlots,
        defaultTimezone: SEARCH_CONFIG_DEFAULT_TIMEZONE
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/app/search-config', async (req, res, next) => {
  try {
    const { userId, ...rest } = patchSchema.parse(req.body);
    const config = await updateUserSearchConfig(userId, rest);
    res.json({ config: serializeConfig(config) });
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const message = issue?.path?.includes('slots')
        ? '请至少保留一个执行时间，可先添加新的时间再删除旧的'
        : '请求参数不符合要求，请检查后重试';
      return res.status(400).json({ code: 'BAD_REQUEST', message });
    }
    next(error);
  }
});

router.post('/app/search-config/test-feishu', async (req, res, next) => {
  try {
    const { userId } = feishuTestSchema.parse(req.body);
    const result = await testFeishuChannel(userId);
    res.json({
      status: result.status,
      testedAt: result.testedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: '请求参数不符合要求，请检查后重试' });
    }
    next(error);
  }
});

function serializeConfig(config: {
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
}) {
  return {
    userId: config.userId,
    platforms: config.platforms,
    keywords: config.keywords,
    slots: config.slots,
    notifyEmail: config.notifyEmail,
    timezone: config.timezone,
    notifyChannels: config.notifyChannels,
    feishuWebhook: config.feishuWebhook,
    feishuStatus: config.feishuStatus,
    feishuLastTestedAt: config.feishuLastTestedAt ? config.feishuLastTestedAt.toISOString() : null,
    nextRunAt: config.nextRunAt ? config.nextRunAt.toISOString() : null,
    lastRunAt: config.lastRunAt ? config.lastRunAt.toISOString() : null,
    lastNotifiedAt: config.lastNotifiedAt ? config.lastNotifiedAt.toISOString() : null,
    createdAt: config.createdAt ? config.createdAt.toISOString() : null,
    updatedAt: config.updatedAt ? config.updatedAt.toISOString() : null,
    limits: {
      maxKeywords: config.limits.maxKeywords,
      maxSlots: config.limits.maxSlots
    }
  };
}

export default router;
