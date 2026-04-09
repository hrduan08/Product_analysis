// 该文件实现支付订单的核心业务逻辑，包括预下单、订单状态查询以及支付成功后激活订阅。

import { addMinutes } from 'date-fns';

import { prisma } from '../../db/prisma.js';
import {
  getMissingAlipayFields,
  getMissingPersonalWechatFields,
  getMissingWechatFields,
  paymentConfig
} from '../../config/payment.js';
import { generateOutTradeNo } from './order-number.js';
import { createNativeOrder } from './wechat-provider.js';
import { createPrecreateOrder } from './alipay-provider.js';
import type { PaymentOrder, PaymentProvider, PaymentStatus, Plan } from '../../generated/prisma/client.js';
import { createSubscription } from '../billing/subscription-service.js';
import { notifyAlert } from '../alert/notifier.js';
import { notifyOperations } from '../operations-notify.js';

export type CheckoutResult = {
  orderId: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  outTradeNo: string;
  expiresAt: string | null;
  plan: { id: string; name: string; description?: string | null };
  wechat?: { codeUrl: string };
  alipay?: { qrCode: string };
  mock?: { paymentUrl: string };
  personalWechat?: { qrUrl: string; tips?: string; supportQrUrl?: string };
};

function assertProviderConfigured(provider: PaymentProvider): void {
  if (provider === 'wechat') {
    const missing = getMissingWechatFields();
    if (missing.length) {
      throw new Error(`微信支付暂未配置：缺少 ${missing.join(', ')}`);
    }
  } else if (provider === 'wechat_personal') {
    const missing = getMissingPersonalWechatFields();
    if (missing.length) {
      throw new Error(`微信个人收款暂未配置：缺少 ${missing.join(', ')}`);
    }
  } else if (provider === 'alipay') {
    const missing = getMissingAlipayFields();
    if (missing.length) {
      throw new Error(`支付宝支付暂未配置：缺少 ${missing.join(', ')}`);
    }
  }
}

export async function createPaymentOrder(input: {
  userId: string;
  planCode: string;
  provider: PaymentProvider;
}): Promise<CheckoutResult> {
  const plan = await prisma.plan.findUnique({ where: { code: input.planCode, is_active: true } });
  if (!plan) {
    throw new Error('未找到可用套餐');
  }
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new Error('用户不存在');
  }
  assertProviderConfigured(input.provider);

  const amount = plan.price_cents;
  const currency = plan.currency;
  const outTradeNo = generateOutTradeNo();
  const expireMinutes =
    input.provider === 'wechat_personal'
      ? paymentConfig.personalWechat.orderExpireMinutes ?? paymentConfig.orderExpireMinutes
      : paymentConfig.orderExpireMinutes;
  const expiresAt = addMinutes(new Date(), expireMinutes);

  if (amount === 0) {
    const order = await prisma.paymentOrder.create({
      data: {
        user_id: user.id,
        plan_id: plan.id,
        subscription_id: null,
        provider: input.provider,
        status: 'paid',
        amount_cents: amount,
        currency,
        description: `订阅 ${plan.name}`,
        out_trade_no: outTradeNo,
        expires_at: expiresAt,
        paid_at: new Date()
      }
    });
    const subscriptionResult = await createSubscription({ userId: user.id, planCode: plan.code });
    await prisma.invoice.update({
      where: { id: subscriptionResult.invoice.id },
      data: { payment_order_id: order.id }
    });
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { subscription_id: subscriptionResult.subscription.id }
    });
    return {
      orderId: order.id,
      status: 'paid',
      provider: input.provider,
      amount,
      currency,
      outTradeNo,
      expiresAt: order.expires_at?.toISOString() ?? null,
      plan: { id: plan.id, name: plan.name, description: plan.description },
      mock: { paymentUrl: 'paid' }
    };
  }

  const order = await prisma.paymentOrder.create({
    data: {
      user_id: user.id,
      plan_id: plan.id,
      provider: input.provider,
      status: 'pending',
      amount_cents: amount,
      currency,
      description: `订阅 ${plan.name}`,
      out_trade_no: outTradeNo,
      expires_at: expiresAt
    }
  });

  void notifyOperations(
    `【订单提醒】用户 ${user.email} 创建待确认订单：套餐 ${plan.name}，金额 ¥${(amount / 100).toFixed(2)}，渠道 ${input.provider}，订单号 ${outTradeNo}`
  ).catch((error) => {
    console.error('[ops-notify] 订单通知失败', error);
  });

  let wechat;
  let alipay;
  let mock;
  let personalWechat;

  if (input.provider === 'wechat') {
    const result = await createNativeOrder({
      outTradeNo,
      description: `订阅 ${plan.name}`,
      amount
    });
    wechat = { codeUrl: result.codeUrl };
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        external_payload: result,
        expires_at: result.expireTime ? new Date(result.expireTime) : expiresAt
      }
    });
  } else if (input.provider === 'alipay') {
    const result = await createPrecreateOrder({
      outTradeNo,
      subject: `订阅 ${plan.name}`,
      amount
    });
    alipay = { qrCode: result.qrCode };
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { external_payload: result }
    });
  } else if (input.provider === 'wechat_personal') {
    const cfg = paymentConfig.personalWechat;
    personalWechat = {
      qrUrl: cfg.qrUrl!,
      tips: cfg.tips ?? '请备注订单号或账号邮箱，便于人工核实。',
      supportQrUrl: cfg.supportQrUrl ?? undefined
    };
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        external_payload: {
          provider: 'wechat_personal',
          qrUrl: personalWechat.qrUrl,
          tips: personalWechat.tips,
          supportQrUrl: personalWechat.supportQrUrl
        }
      }
    });
  } else {
    mock = { paymentUrl: `https://example.com/mock-pay?orderId=${order.id}` };
  }

  return {
    orderId: order.id,
    status: order.status,
    provider: order.provider,
    amount,
    currency,
    outTradeNo,
    expiresAt: (order.expires_at ?? expiresAt).toISOString(),
    plan: { id: plan.id, name: plan.name, description: plan.description },
    wechat,
    alipay,
    mock,
    personalWechat
  };
}

export async function getPaymentOrder(orderId: string): Promise<PaymentOrder & { plan: Plan }> {
  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    include: { plan: true }
  });
  if (!order) {
    throw new Error('订单不存在');
  }
  return order;
}

export async function markOrderPaid(params: {
  outTradeNo: string;
  provider: PaymentProvider;
  externalTradeNo?: string;
  notifyPayload?: unknown;
  amountCents?: number;
}): Promise<void> {
  const order = await prisma.paymentOrder.findUnique({ where: { out_trade_no: params.outTradeNo } });
  if (!order) {
    throw new Error('订单不存在');
  }
  if (order.status === 'paid') {
    return;
  }
  const plan = await prisma.plan.findUnique({ where: { id: order.plan_id } });
  if (!plan) {
    throw new Error('关联套餐不存在');
  }

  if (typeof params.amountCents === 'number' && order.amount_cents !== params.amountCents) {
    try {
      await notifyAlert('支付金额不一致', {
        orderId: order.id,
        userId: order.user_id,
        planId: order.plan_id,
        provider: order.provider,
        outTradeNo: order.out_trade_no,
        expectedAmount: order.amount_cents,
        receivedAmount: params.amountCents
      }, {
        severity: 'critical',
        dedupeKey: `payment:amount-mismatch:${order.id}`,
        tags: ['payment', 'amount'],
        source: 'payment-service'
      });
    } catch (alertError) {
      console.error('[alert] 记录支付金额不一致告警失败', alertError);
    }

    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: 'failed',
        notify_payload: params.notifyPayload,
        description: `金额不一致：期望 ${order.amount_cents}，实际 ${params.amountCents}`,
        last_error: 'AMOUNT_MISMATCH',
        retry_count: order.retry_count + 1
      }
    });
    return;
  }

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: 'paid',
      external_trade_no: params.externalTradeNo,
      notify_payload: params.notifyPayload,
      paid_at: new Date()
    }
  });

  const subscriptionResult = await createSubscription({ userId: order.user_id, planCode: plan.code });
  await prisma.invoice.update({
    where: { id: subscriptionResult.invoice.id },
    data: { payment_order_id: order.id }
  });
  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { subscription_id: subscriptionResult.subscription.id }
  });
}

export async function markOrderFailed(params: {
  outTradeNo: string;
  provider: PaymentProvider;
  reason?: string;
  notifyPayload?: unknown;
}): Promise<void> {
  const order = await prisma.paymentOrder.findUnique({ where: { out_trade_no: params.outTradeNo } });
  if (!order || order.status !== 'pending') {
    return;
  }
  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: 'failed',
      notify_payload: params.notifyPayload,
      description: params.reason ?? order.description,
      last_error: params.reason ?? 'PAY_FAILED',
      retry_count: order.retry_count + 1
    }
  });
  try {
    await notifyAlert('支付订单失败', {
      orderId: order.id,
      userId: order.user_id,
      planId: order.plan_id,
      outTradeNo: order.out_trade_no,
      provider: order.provider,
      reason: params.reason ?? 'PAY_FAILED',
      lastError: params.reason ?? 'PAY_FAILED',
      retryCount: order.retry_count + 1
    }, {
      severity: 'warning',
      dedupeKey: `payment:failed:${order.id}`,
      tags: ['payment', 'failed'],
      source: 'payment-service'
    });
  } catch (alertError) {
    console.error('[alert] 记录支付失败告警失败', alertError);
  }
}

export async function markOrderExpired(orderId: string, reason = 'ORDER_EXPIRED'): Promise<void> {
  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status !== 'pending') {
    return;
  }
  await prisma.paymentOrder.update({
    where: { id: orderId },
    data: {
      status: 'expired',
      last_error: reason,
      retry_count: order.retry_count + 1,
      notify_payload: order.notify_payload
    }
  });
  try {
    await notifyAlert('支付订单已过期', {
      orderId: order.id,
      userId: order.user_id,
      planId: order.plan_id,
      outTradeNo: order.out_trade_no,
      provider: order.provider,
      reason,
      retryCount: order.retry_count + 1,
      expiresAt: order.expires_at
    }, {
      severity: 'warning',
      dedupeKey: `payment:expired:${order.id}`,
      tags: ['payment', 'expired'],
      source: 'payment-service'
    });
  } catch (alertError) {
    console.error('[alert] 记录支付过期告警失败', alertError);
  }
}
