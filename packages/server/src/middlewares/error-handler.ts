import type { NextFunction, Request, Response } from 'express';

type KnownError = Error & { status?: number };

export function errorHandler(
  err: KnownError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.status ?? 500;
  const message = err.message || '服务器内部错误';

  if (status >= 500) {
    console.error('[error]', err);
  } else {
    console.warn('[warn]', message);
  }

  res.status(status).json({
    code: status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR',
    message
  });
}
