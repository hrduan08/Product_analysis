// 该文件定义支付相关的 HTTP 接口：创建订单、查询状态与接收异步通知。

import { Request, Router } from 'express';
import { z } from 'zod';

import { createPaymentOrder, getPaymentOrder, markOrderFailed, markOrderPaid } from '../services/payment/payment-service.js';
import { createHttpError } from '../utils/http-error.js';
import { verifyAndParseWechatNotify } from '../services/payment/wechat-notify.js';
import { verifyAlipayNotify } from '../services/payment/alipay-notify.js';
import { notifyAlert } from '../services/alert/notifier.js';
import {
  getMissingAlipayFields,
  getMissingPersonalWechatFields,
  getMissingWechatFields,
  isAlipayConfigured,
  isPersonalWechatConfigured,
  isWechatConfigured
} from '../config/payment.js';

const router = Router();

type RequestWithRaw = Request & { rawBody?: string };

const checkoutSchema = z.object({
  userId: z.string().min(1),
  planCode: z.string().min(1),
  provider: z.enum(['wechat', 'alipay', 'wechat_personal', 'mock'])
});

router.post('/checkout', async (req, res, next) => {
  try {
    const payload = checkoutSchema.parse(req.body);
    const result = await createPaymentOrder(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/providers', (_req, res) => {
  res.json({
    providers: [
      { provider: 'wechat', enabled: isWechatConfigured(), missing: getMissingWechatFields() },
      { provider: 'alipay', enabled: isAlipayConfigured(), missing: getMissingAlipayFields() },
      {
        provider: 'wechat_personal',
        enabled: isPersonalWechatConfigured(),
        missing: getMissingPersonalWechatFields()
      }
    ]
  });
});

router.get('/:orderId', async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    if (!orderId) {
      throw createHttpError(400, '缺少 orderId');
    }
    const order = await getPaymentOrder(orderId);
    res.json({
      orderId: order.id,
      status: order.status,
      provider: order.provider,
      amount: order.amount_cents,
      currency: order.currency,
      outTradeNo: order.out_trade_no,
      paidAt: order.paid_at,
      expiresAt: order.expires_at,
      subscriptionId: order.subscription_id,
      plan: {
        id: order.plan.id,
        name: order.plan.name
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/notify/wechat', async (req, res) => {
  try {
    const rawBody = (req as RequestWithRaw).rawBody ?? JSON.stringify(req.body);
    const parsed = verifyAndParseWechatNotify(req.headers as Record<string, unknown>, rawBody, req.body);
    const resource = parsed.resource as { out_trade_no?: string; trade_state?: string; transaction_id?: string };
    if (!resource?.out_trade_no) {
      res.status(400).send('missing out_trade_no');
      return;
    }
    if (resource.trade_state === 'SUCCESS') {
      const amountTotal = typeof (resource as any).amount?.total === 'number' ? (resource as any).amount.total : undefined;
      await markOrderPaid({
        outTradeNo: resource.out_trade_no,
        provider: 'wechat',
        externalTradeNo: resource.transaction_id,
        notifyPayload: parsed,
        amountCents: amountTotal
      });
      res.status(200).send('success');
    } else {
      await markOrderFailed({ outTradeNo: resource.out_trade_no, provider: 'wechat', notifyPayload: parsed, reason: resource.trade_state });
      res.status(200).send('success');
    }
  } catch (error) {
    console.error('[wechat notify] error', error);
    void notifyAlert('微信支付回调处理失败', {
      error: error instanceof Error ? { message: error.message, name: error.name } : String(error),
      body: req.body
    }, {
      severity: 'critical',
      dedupeKey: 'payment:notify:wechat:error',
      tags: ['payment', 'notify', 'wechat'],
      source: 'payment-notify',
      throttleMinutes: 5
    }).catch((alertError) => {
      console.error('[alert] 微信回调告警发送失败', alertError);
    });
    res.status(500).send('error');
  }
});

router.post('/notify/alipay', async (req, res) => {
  try {
    const payload = req.body as Record<string, string>;
    verifyAlipayNotify(payload);
    const outTradeNo = payload.out_trade_no;
    if (!outTradeNo) {
      res.status(400).send('missing out_trade_no');
      return;
    }
    if (payload.trade_status === 'TRADE_SUCCESS') {
      const amountCents = parseAlipayAmount(payload.total_amount);
      await markOrderPaid({
        outTradeNo,
        provider: 'alipay',
        externalTradeNo: payload.trade_no,
        notifyPayload: payload,
        amountCents
      });
      res.status(200).send('success');
    } else {
      await markOrderFailed({ outTradeNo, provider: 'alipay', notifyPayload: payload, reason: payload.trade_status });
      res.status(200).send('success');
    }
  } catch (error) {
    console.error('[alipay notify] error', error);
    void notifyAlert('支付宝支付回调处理失败', {
      error: error instanceof Error ? { message: error.message, name: error.name } : String(error),
      body: req.body
    }, {
      severity: 'critical',
      dedupeKey: 'payment:notify:alipay:error',
      tags: ['payment', 'notify', 'alipay'],
      source: 'payment-notify',
      throttleMinutes: 5
    }).catch((alertError) => {
      console.error('[alert] 支付宝回调告警发送失败', alertError);
    });
    res.status(500).send('error');
  }
});

function parseAlipayAmount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return undefined;
  return Math.round(parsed * 100);
}

export default router;
