// 该路由提供简单的后台接口，用于运营查看支付订单与订阅状态，以及手动重试支付。

import { Router } from 'express';

import { adminGuard } from '../middlewares/admin-guard.js';
import { prisma } from '../db/prisma.js';
import { markOrderExpired, markOrderFailed, markOrderPaid } from '../services/payment/payment-service.js';
import { queryAlipayTransaction, queryWechatTransaction } from '../services/payment/provider-query.js';
import type { AlertSeverity } from '../generated/prisma/client.js';

const router = Router();

router.use(adminGuard);

router.get('/payments', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status } : {};
    const orders = await prisma.paymentOrder.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: { plan: true, user: true }
    });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

router.post('/payments/:orderId/retry', async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }
    if (order.status !== 'pending') {
      res.json({ message: `订单状态为 ${order.status}，无需重试` });
      return;
    }
    if (order.provider === 'wechat') {
      const result = await queryWechatTransaction(order.out_trade_no);
      if (result.trade_state === 'SUCCESS') {
        const amountTotal = typeof (result as any).amount?.total === 'number' ? (result as any).amount.total : undefined;
        await markOrderPaid({
          outTradeNo: order.out_trade_no,
          provider: 'wechat',
          externalTradeNo: result.transaction_id,
          notifyPayload: result,
          amountCents: amountTotal
        });
        res.json({ message: '已成功更新订单状态', result });
        return;
      }
      if (['NOTPAY', 'USERPAYING'].includes(result.trade_state)) {
        res.json({ message: '订单仍在支付中', result });
        return;
      }
      await markOrderFailed({ outTradeNo: order.out_trade_no, provider: 'wechat', reason: result.trade_state, notifyPayload: result });
      res.json({ message: '已标记为失败', result });
    } else if (order.provider === 'alipay') {
      const result = await queryAlipayTransaction(order.out_trade_no);
      if (result.trade_status === 'TRADE_SUCCESS') {
        const amountCents = parseAlipayAmount((result as any).total_amount);
        await markOrderPaid({
          outTradeNo: order.out_trade_no,
          provider: 'alipay',
          externalTradeNo: result.trade_no,
          notifyPayload: result,
          amountCents
        });
        res.json({ message: '已成功更新订单状态', result });
        return;
      }
      if (['WAIT_BUYER_PAY'].includes(result.trade_status)) {
        res.json({ message: '订单仍在支付中', result });
        return;
      }
      await markOrderFailed({ outTradeNo: order.out_trade_no, provider: 'alipay', reason: result.trade_status, notifyPayload: result });
      res.json({ message: '已标记为失败', result });
    } else {
      res.json({ message: 'mock provider 无需重试' });
    }
  } catch (error) {
    next(error);
  }
});

router.get('/subscriptions', async (_req, res, next) => {
  try {
    const subs = await prisma.userSubscription.findMany({
      orderBy: { updated_at: 'desc' },
      take: 50,
      include: { plan: true, user: true }
    });
    res.json({ subscriptions: subs });
  } catch (error) {
    next(error);
  }
});

router.post('/payments/:orderId/expire', async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const reason = typeof req.body?.reason === 'string' && req.body.reason.length > 0 ? req.body.reason : 'ADMIN_EXPIRE';
    const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }
    await markOrderExpired(orderId, reason);
    res.json({ message: '订单已标记为过期', reason });
  } catch (error) {
    next(error);
  }
});

router.post('/payments/:orderId/fail', async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const reason = typeof req.body?.reason === 'string' && req.body.reason.length > 0 ? req.body.reason : 'ADMIN_MARK_FAILED';
    const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }
    if (order.status !== 'pending') {
      res.status(400).json({ message: `订单状态为 ${order.status}，无法标记失败` });
      return;
    }
    await markOrderFailed({
      outTradeNo: order.out_trade_no,
      provider: order.provider,
      reason
    });
    res.json({ message: '订单已标记为失败', reason });
  } catch (error) {
    next(error);
  }
});

router.post('/payments/:orderId/confirm', async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ message: '订单不存在' });
      return;
    }
    if (order.status !== 'pending') {
      res.status(400).json({ message: `订单状态为 ${order.status}，无需确认` });
      return;
    }
    await markOrderPaid({
      outTradeNo: order.out_trade_no,
      provider: order.provider,
      notifyPayload: { source: 'admin_manual_confirm' }
    });
    res.json({ message: '订单已确认支付' });
  } catch (error) {
    next(error);
  }
});

router.get('/alerts', async (req, res, next) => {
  try {
    const severityParam = typeof req.query.severity === 'string' ? req.query.severity : undefined;
    const allowedSeverity: AlertSeverity[] = ['info', 'warning', 'critical'];
    const severity = severityParam && allowedSeverity.includes(severityParam as AlertSeverity)
      ? (severityParam as AlertSeverity)
      : undefined;
    const alerts = await prisma.alert.findMany({
      where: severity ? { severity: severity as any } : undefined,
      orderBy: { last_triggered_at: 'desc' },
      take: 50
    });
    res.json({
      alerts: alerts.map((alert) => ({
        id: alert.id,
        dedupe_key: alert.dedupe_key,
        message: alert.message,
        severity: alert.severity,
        source: alert.source,
        tags: alert.tags,
        occurrences: alert.occurrences,
        lastTriggeredAt: alert.last_triggered_at,
        lastNotifiedAt: alert.last_notified_at,
        payload: alert.payload
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { profile: true, plan: true },
      orderBy: { created_at: 'desc' }
    });

    const mapped = users
      .map((user) => {
        let membershipLabel = '非会员';
        let sortWeight = 2;
        let expireAt: Date | null = null;

        if (user.status === 'trialing') {
          membershipLabel = '试用中';
          sortWeight = 1;
          expireAt = user.trial_ends_at;
        } else if (user.status === 'active' && user.plan) {
          if (user.plan.billing_interval === 'monthly') {
            membershipLabel = '月度会员';
            sortWeight = 0;
          } else if (user.plan.billing_interval === 'yearly') {
            membershipLabel = '年度会员';
            sortWeight = 0;
          } else {
            membershipLabel = '已订阅';
            sortWeight = 0;
          }
          expireAt = user.plan_expire_at;
        }

        return {
          id: user.id,
          email: user.email,
          nickname: user.profile?.full_name ?? null,
          createdAt: user.created_at,
          membershipLabel,
          membershipExpireAt: expireAt,
          sortWeight
        };
      })
      .sort((a, b) => {
        if (a.sortWeight !== b.sortWeight) {
          return a.sortWeight - b.sortWeight;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    res.json({ users: mapped });
  } catch (error) {
    next(error);
  }
});

export default router;

function parseAlipayAmount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return Math.round(parsed * 100);
}
