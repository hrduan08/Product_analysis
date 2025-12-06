import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';

const router = Router();

const querySchema = z.object({
  userId: z.string().uuid(),
  limit: z
    .preprocess((value) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
      return undefined;
    }, z.number().int().min(1).max(200).optional())
});

router.get('/app/task-history', async (req, res, next) => {
  try {
    const parsed = querySchema.parse(req.query);
    const limit = parsed.limit ?? 20;
    const jobs = await prisma.notifyJob.findMany({
      where: { user_id: parsed.userId },
      orderBy: { run_at: 'desc' },
      take: limit
    });

    const runs = jobs.map((job) => {
      const ctx = (job.context ?? {}) as Record<string, unknown>;
      return {
        id: job.id,
        runAt: job.run_at.toISOString(),
        status: job.status,
        newItems: job.total_new,
        totalSent: job.total_sent,
        errorMessage: job.error_message ?? null,
        keywords: ensureStringArray(ctx.keywords),
        platforms: ensureStringArray(ctx.platforms),
        slots: ensureStringArray(ctx.slots),
        notifyChannels: ensureStringArray(ctx.notifyChannels)
      };
    });

    res.json({ runs });
  } catch (error) {
    next(error);
  }
});

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item : String(item)))
    .filter((item) => item.length > 0);
}

export default router;
