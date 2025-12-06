// 仅用于开发环境的支付模拟接口，可手动指定订单状态，方便测试。

import { Router } from 'express';

import { adminGuard } from '../middlewares/admin-guard.js';
import { prisma } from '../db/prisma.js';
import { markOrderExpired, markOrderFailed, markOrderPaid } from '../services/payment/payment-service.js';

const router = Router();

if (process.env.NODE_ENV !== 'production') {
  router.use(adminGuard);

  router.post('/:orderId/mock-status', async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { status, reason, payload, externalTradeNo, amountCents } = req.body as {
        status?: string;
        reason?: string;
        payload?: unknown;
        externalTradeNo?: string;
        amountCents?: number;
      };
      if (!status) {
        res.status(400).json({ message: '缺少 status 参数' });
        return;
      }
      const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
      if (!order) {
        res.status(404).json({ message: '订单不存在' });
        return;
      }
      if (status === 'paid') {
        await markOrderPaid({
          outTradeNo: order.out_trade_no,
          provider: order.provider,
          externalTradeNo: externalTradeNo ?? `MOCK-${order.out_trade_no}`,
          notifyPayload: payload ?? { source: 'mock-status', status },
          amountCents: amountCents
        });
      } else if (status === 'failed') {
        await markOrderFailed({
          outTradeNo: order.out_trade_no,
          provider: order.provider,
          reason: reason ?? 'MOCK_FAILED',
          notifyPayload: payload ?? { source: 'mock-status', status }
        });
      } else if (status === 'expired') {
        await markOrderExpired(order.id, reason ?? 'MOCK_EXPIRED');
      } else {
        res.status(400).json({ message: `不支持的状态：${status}` });
        return;
      }
      const updated = await prisma.paymentOrder.findUnique({
        where: { id: orderId },
        include: { subscription: true }
      });
      res.json({
        message: '已更新',
        status,
        reason,
        subscriptionId: updated?.subscription_id,
        notifyPayload: updated?.notify_payload
      });
    } catch (error) {
      next(error);
    }
  });
}

export default router;
