import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../db/prisma.js';
import { createHttpError } from '../../utils/http-error.js';
import {
  searchTierLimits,
  resolveSearchTier,
  getDailyBudgetAcrossKeys
} from '../../config/search-limits.js';
import { youtubeConfig } from '../../config/youtube.js';

const GUARDED_STATUSES: Prisma.UserStatus[] = ['trialing', 'active'];

export async function ensureDailyQuotaCapacity(requiredUnits: number): Promise<void> {
  if (requiredUnits <= 0) {
    return;
  }

  const stats = await prisma.user.groupBy({
    by: ['status'],
    _count: {
      _all: true
    },
    where: {
      status: {
        in: GUARDED_STATUSES
      }
    }
  });

  let occupiedUnits = 0;
  for (const row of stats) {
    const status = row.status as Prisma.UserStatus;
    const tier = resolveSearchTier(status);
    const tierUnits = searchTierLimits[tier].unitsPerDay;
    occupiedUnits += tierUnits * row._count._all;
  }

  const capacity = getDailyBudgetAcrossKeys() * youtubeConfig.saturationRatio;
  if (occupiedUnits + requiredUnits > capacity) {
    throw createHttpError(429, '当前抓取配额紧张，暂无法新增订阅，请稍后再试');
  }
}
