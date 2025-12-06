// 该文件提供生成支付订单号的工具函数。

import { randomUUID } from 'node:crypto';

import { paymentConfig } from '../../config/payment.js';

export function generateOutTradeNo(): string {
  const prefix = paymentConfig.orderPrefix.replace(/[^A-Z0-9]/gi, '').slice(0, 6) || 'PI';
  const uuid = randomUUID().replace(/-/g, '').slice(0, 18).toUpperCase();
  return `${prefix}${uuid}`;
}
