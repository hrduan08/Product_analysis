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
    redditCommunities: z.array(z.string()).optional(),
    redditKeywords: z.array(z.string()).optional(),
    youtubeKeywords: z.array(z.string()).optional(),
    productWebsiteUrl: z.string().optional(),
    productCommerceUrl: z.string().optional(),
    productDescription: z.string().optional(),
    productProfile: z
      .object({
        brand: z.string().optional(),
        productName: z.string().optional(),
        category: z.string().optional(),
        coreFeatures: z.array(z.string()).optional(),
        targetProducts: z
          .array(
            z.object({
              name: z.string(),
              coreFeatures: z.array(z.string()).optional()
            })
          )
          .optional()
      })
      .optional(),
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
        maxRedditCommunities: config.limits.maxRedditCommunities,
        maxRedditKeywords: config.limits.maxRedditKeywords,
        maxYoutubeKeywords: config.limits.maxYoutubeKeywords,
        defaultTimezone: SEARCH_CONFIG_DEFAULT_TIMEZONE,
        redditBetaAllowed: config.meta.redditBetaAllowed
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
      const message = '请求参数不符合要求，请检查后重试';
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
    targetProducts: Array<{
      name: string;
      coreFeatures: string[];
    }>;
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
}) {
  return {
    userId: config.userId,
    platforms: config.platforms,
    redditCommunities: config.redditCommunities,
    redditKeywords: config.redditKeywords,
    youtubeKeywords: config.youtubeKeywords,
    notifyEmail: config.notifyEmail,
    timezone: config.timezone,
    productWebsiteUrl: config.productWebsiteUrl,
    productCommerceUrl: config.productCommerceUrl,
    productDescription: config.productDescription,
    productProfile: {
      status: config.productProfile.status,
      error: config.productProfile.error,
      generatedAt: config.productProfile.generatedAt ? config.productProfile.generatedAt.toISOString() : null,
      updatedByUser: config.productProfile.updatedByUser,
      brand: config.productProfile.brand,
      productName: config.productProfile.productName,
      category: config.productProfile.category,
      coreFeatures: config.productProfile.coreFeatures,
      targetProducts: config.productProfile.targetProducts
    },
    notifyChannels: config.notifyChannels,
    feishuWebhook: config.feishuWebhook,
    feishuStatus: config.feishuStatus,
    feishuLastTestedAt: config.feishuLastTestedAt ? config.feishuLastTestedAt.toISOString() : null,
    nextRunAt: config.nextRunAt ? config.nextRunAt.toISOString() : null,
    redditLastRunAt: config.redditLastRunAt ? config.redditLastRunAt.toISOString() : null,
    youtubeLastRunAt: config.youtubeLastRunAt ? config.youtubeLastRunAt.toISOString() : null,
    lastNotifiedAt: config.lastNotifiedAt ? config.lastNotifiedAt.toISOString() : null,
    createdAt: config.createdAt ? config.createdAt.toISOString() : null,
    updatedAt: config.updatedAt ? config.updatedAt.toISOString() : null,
    limits: {
      maxRedditCommunities: config.limits.maxRedditCommunities,
      maxRedditKeywords: config.limits.maxRedditKeywords,
      maxYoutubeKeywords: config.limits.maxYoutubeKeywords
    }
  };
}

export default router;
