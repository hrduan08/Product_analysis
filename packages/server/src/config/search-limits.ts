import type { Prisma } from '../generated/prisma/client.js';
import { youtubeConfig } from './youtube.js';

type UserStatus = Prisma.UserStatus;

export type SearchTier = 'trial' | 'paid' | 'none';

const unitsPerSearch = youtubeConfig.searchUnitsPerCall + youtubeConfig.videoUnitsPerCall;

export type SearchTierLimits = {
  maxRedditCommunities: number;
  maxRedditKeywords: number;
  maxYoutubeKeywords: number;
  unitsPerDay: number;
};

export const searchTierLimits: Record<SearchTier, SearchTierLimits> = {
  trial: {
    maxRedditCommunities: 1,
    maxRedditKeywords: 1,
    maxYoutubeKeywords: 1,
    unitsPerDay: unitsPerSearch
  },
  paid: {
    maxRedditCommunities: 3,
    maxRedditKeywords: 2,
    maxYoutubeKeywords: 2,
    unitsPerDay: 4 * unitsPerSearch
  },
  none: {
    maxRedditCommunities: 0,
    maxRedditKeywords: 0,
    maxYoutubeKeywords: 0,
    unitsPerDay: 0
  }
};

export function resolveSearchTier(status: UserStatus): SearchTier {
  if (status === 'trialing') {
    return 'trial';
  }
  if (status === 'active') {
    return 'paid';
  }
  return 'none';
}

export function getTierLimitsByStatus(status: UserStatus): { tier: SearchTier } & SearchTierLimits {
  const tier = resolveSearchTier(status);
  const limits = searchTierLimits[tier];
  return {
    tier,
    maxRedditCommunities: limits.maxRedditCommunities,
    maxRedditKeywords: limits.maxRedditKeywords,
    maxYoutubeKeywords: limits.maxYoutubeKeywords,
    unitsPerDay: limits.unitsPerDay
  };
}

export function getDailyBudgetAcrossKeys(): number {
  return youtubeConfig.apiKeys.length * youtubeConfig.dailyQuotaPerKey;
}
