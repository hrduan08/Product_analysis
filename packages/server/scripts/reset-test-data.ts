import '../src/load-env.js';

import { prisma } from '../src/db/prisma.js';

async function main(): Promise<void> {
  await prisma.invoice.deleteMany({});
  await prisma.paymentOrder.deleteMany({});
  await prisma.userSubscription.deleteMany({});
  await prisma.notifyJob.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('[reset-test-data] 已清空用户、订阅、订单、发票、告警等测试数据');
}

main()
  .catch((error) => {
    console.error('[reset-test-data] 清理失败', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
