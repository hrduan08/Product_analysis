// 该脚本扫描超时未支付订单并标记为 expired，便于运营保持数据一致性。

import { prisma } from '../src/db/prisma.js';
import { markOrderExpired } from '../src/services/payment/payment-service.js';

async function main(): Promise<void> {
  const now = new Date();
  const orders = await prisma.paymentOrder.findMany({
    where: {
      status: 'pending',
      expires_at: { not: null, lt: now }
    }
  });
  if (orders.length === 0) {
    console.log('暂无超时待支付订单');
    return;
  }
  for (const order of orders) {
    console.log(`标记订单 ${order.id} 为已过期`);
    await markOrderExpired(order.id);
  }
}

main()
  .catch((error) => {
    console.error('过期订单处理失败', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
