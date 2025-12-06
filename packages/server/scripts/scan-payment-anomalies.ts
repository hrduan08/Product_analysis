// 该脚本扫描支付异常情况并输出结构化日志，便于接入报警。

import { subHours } from 'date-fns';

import { prisma } from '../src/db/prisma.js';
import { markOrderExpired } from '../src/services/payment/payment-service.js';
import { notifyAlert } from '../src/services/alert/notifier.js';

async function main(): Promise<void> {
  const now = new Date();
  const pendingOrders = await prisma.paymentOrder.findMany({
    where: {
      status: 'pending',
      expires_at: { not: null, lt: now }
    }
  });

  for (const order of pendingOrders) {
    await markOrderExpired(order.id, 'CRON_EXPIRE');
    console.error('[payment][expired]', {
      orderId: order.id,
      outTradeNo: order.out_trade_no,
      provider: order.provider,
      amount: order.amount_cents
    });
    await notifyAlert('支付订单已过期', {
      orderId: order.id,
      outTradeNo: order.out_trade_no,
      provider: order.provider,
      amount: order.amount_cents,
      reason: 'CRON_EXPIRE'
    }, {
      severity: 'warning',
      dedupeKey: `payment:expired:${order.id}`,
      tags: ['payment', 'expired'],
      source: 'scan:payments',
      throttleMinutes: 60
    });
  }

  const recentFailed = await prisma.paymentOrder.findMany({
    where: {
      status: { in: ['failed', 'expired'] },
      updated_at: { gt: subHours(now, 1) }
    }
  });

  for (const order of recentFailed) {
    console.error('[payment][failed]', {
      orderId: order.id,
      outTradeNo: order.out_trade_no,
      provider: order.provider,
      amount: order.amount_cents,
      lastError: order.last_error,
      retryCount: order.retry_count
    });
    await notifyAlert('支付订单失败', {
      orderId: order.id,
      outTradeNo: order.out_trade_no,
      provider: order.provider,
      amount: order.amount_cents,
      lastError: order.last_error,
      retryCount: order.retry_count
    }, {
      severity: 'warning',
      dedupeKey: `payment:failed:${order.id}`,
      tags: ['payment', 'failed'],
      source: 'scan:payments',
      throttleMinutes: 60
    });
  }
}

main()
  .catch(async (error) => {
    console.error('[payment][scan-error]', error);
    await notifyAlert('支付异常扫描任务失败', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error)
    }, {
      severity: 'critical',
      dedupeKey: 'payment:scan:error',
      tags: ['payment', 'scan'],
      source: 'scan:payments',
      throttleMinutes: 10
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
