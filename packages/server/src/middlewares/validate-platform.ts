import type { NextFunction, Request, Response } from 'express';

import type { Platform } from '../types/search.js';

const SUPPORTED_PLATFORMS: Platform[] = ['youtube', 'reddit'];

export function validatePlatform(req: Request, res: Response, next: NextFunction) {
  const raw = req.query.platform;
  const platform = typeof raw === 'string' ? (raw.toLowerCase() as Platform) : undefined;

  if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({
      code: 'INVALID_PLATFORM',
      message: `platform 参数必须为 ${SUPPORTED_PLATFORMS.join(', ')} 之一`
    });
  }

  req.query.platform = platform;

  next();
}
