import '../src/load-env.js';

import { randomUUID } from 'node:crypto';
import { fetch } from 'undici';

import { createPaymentOrder } from '../src/services/payment/payment-service.js';
import { prisma } from '../src/db/prisma.js';

async function main(): Promise<void> {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    throw new Error('ADMIN_TOKEN 未配置，无法调用后台接口');
  }

  const user = await prisma.user.create({
    data: {
      email: `alert-test+${randomUUID()}@example.com`,
      password_hash: 'hashed-password',
      trial_ends_at: new Date(),
      status: 'active'
    }
  });

  const order = await createPaymentOrder({
    userId: user.id,
    planCode: 'pro',
    provider: 'mock'
  });

  const response = await fetch(`http://localhost:${process.env.PORT ?? 8080}/api/admin/payments/${order.orderId}/fail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: JSON.stringify({ reason: 'MANUAL_TEST_FAIL' })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`标记失败接口返回 ${response.status}: ${text}`);
  }

  console.log('标记结果', await response.json());
}

main()
  .catch((error) => {
    console.error('[mark-order-failed] error', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
