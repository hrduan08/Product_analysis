import type { Prisma } from '../generated/prisma/client.js';
import { youtubeConfig } from './youtube.js';

type UserStatus = Prisma.UserStatus;

export type SearchTier = 'trial' | 'paid' | 'none';

const unitsPerSearch = youtubeConfig.searchUnitsPerCall + youtubeConfig.videoUnitsPerCall;

export const searchTierLimits: Record<SearchTier, { maxKeywords: number; maxSlots: number; unitsPerDay: number }> = {
  trial: {
    maxKeywords: 1,
    maxSlots: 1,
    unitsPerDay: unitsPerSearch
  },
  paid: {
    maxKeywords: 2,
    maxSlots: 2,
    unitsPerDay: 4 * unitsPerSearch // 2 keywords * 2 slots
  },
  none: {
    maxKeywords: 0,
    maxSlots: 0,
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

export function getTierLimitsByStatus(status: UserStatus): { tier: SearchTier; maxKeywords: number; maxSlots: number; unitsPerDay: number } {
  const tier = resolveSearchTier(status);
  const limits = searchTierLimits[tier];
  return {
    tier,
    maxKeywords: limits.maxKeywords,
    maxSlots: limits.maxSlots,
    unitsPerDay: limits.unitsPerDay
  };
}

export function getDailyBudgetAcrossKeys(): number {
  return youtubeConfig.apiKeys.length * youtubeConfig.dailyQuotaPerKey;
}
