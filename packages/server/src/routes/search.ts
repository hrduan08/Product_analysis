import { Router } from 'express';

import { resolveProvider } from '../providers/index.js';
import { validatePlatform } from '../middlewares/validate-platform.js';
import { validateQuery } from '../middlewares/validate-query.js';
import type { Platform } from '../types/search.js';

const router = Router();

router.get('/search', validatePlatform, validateQuery, async (req, res, next) => {
  try {
    const platform = req.query.platform as Platform;
    const query = req.query.query as string;
    const cursor =
      typeof req.query.cursor === 'string'
        ? req.query.cursor
        : typeof req.query.pageToken === 'string'
        ? req.query.pageToken
        : undefined;

    const limit =
      typeof req.query.limit === 'string' && !Number.isNaN(Number.parseInt(req.query.limit, 10))
        ? Number.parseInt(req.query.limit, 10)
        : undefined;

    const provider = resolveProvider(platform);
    const result = await provider.search({ query, cursor, limit });

    res.json({
      platform,
      keyword: query,
      items: result.items,
      pageInfo: result.pageInfo
    });
  } catch (error) {
    next(error);
  }
});

export default router;
