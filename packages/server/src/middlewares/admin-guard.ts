// 该中间件用于保护管理后台接口，要求提供正确的管理员令牌。

import type { NextFunction, Request, Response } from 'express';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_TOKEN) {
    res.status(500).json({ message: '未配置管理员令牌' });
    return;
  }
  const token = req.header('x-admin-token');
  if (!token || token !== ADMIN_TOKEN) {
    res.status(403).json({ message: '无权限访问' });
    return;
  }
  next();
}
