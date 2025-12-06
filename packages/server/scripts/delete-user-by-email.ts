import '../src/load-env.js';

import { prisma } from '../src/db/prisma.js';

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: pnpm --filter server exec tsx scripts/delete-user-by-email.ts <email>');
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`[delete-user] 用户 ${email} 不存在，跳过`);
    return;
  }

  await prisma.user.delete({ where: { email } });
  console.log(`[delete-user] 已删除用户 ${email} 及相关数据`);
}

main()
  .catch((error) => {
    console.error('[delete-user] 出错：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
