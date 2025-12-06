import type { NextFunction, Request, Response } from 'express';

const MAX_QUERY_LENGTH = 100;

export function validateQuery(req: Request, res: Response, next: NextFunction) {
  const raw = req.query.query;
  const query = typeof raw === 'string' ? raw.trim() : '';

  if (!query) {
    return res.status(400).json({
      code: 'INVALID_QUERY',
      message: '请提供要搜索的关键词'
    });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({
      code: 'QUERY_TOO_LONG',
      message: `关键词长度请控制在 ${MAX_QUERY_LENGTH} 字符以内`
    });
  }

  req.query.query = query;

  next();
}
