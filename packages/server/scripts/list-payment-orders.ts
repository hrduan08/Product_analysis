// 该脚本用于在命令行快速查看近期支付订单的摘要信息，便于运营排查支付状态。

import { format } from 'date-fns'; // 引入 date-fns 格式化时间字符串，提升可读性。

import { prisma } from '../src/db/prisma.js'; // 引入 Prisma 客户端以访问数据库。

async function main(): Promise<void> { // 脚本主函数，封装在 async 中以便使用 await。
  const orders = await prisma.paymentOrder.findMany({ // 查询支付订单列表。
    orderBy: { created_at: 'desc' }, // 按创建时间倒序排列，最新的订单排在前面。
    take: 20, // 只取最近 20 条，避免输出过长。
    include: { plan: true, subscription: true, invoice: true, user: true } // 载入关联数据，方便展示更多细节。
  });

  if (orders.length === 0) { // 如果数据库中还没有订单。
    console.log('暂无支付订单'); // 输出提示信息。
    return; // 脚本结束。
  }

  for (const order of orders) { // 遍历每一条订单。
    const created = format(order.created_at, 'yyyy-MM-dd HH:mm:ss'); // 格式化创建时间。
    const paid = order.paid_at ? format(order.paid_at, 'yyyy-MM-dd HH:mm:ss') : '--'; // 若已支付则格式化支付时间。
    console.log( // 输出订单概要信息。
      `订单ID=${order.id} 状态=${order.status} 平台=${order.provider} 金额=¥${(order.amount_cents / 100).toFixed(2)} 用户=${order.user?.email ?? '未知'} 套餐=${order.plan?.name ?? '未知'} 创建=${created} 支付=${paid}`
    );
    if (order.subscription) { // 若订单已绑定订阅。
      console.log(`  订阅ID=${order.subscription.id} 当前状态=${order.subscription.status}`); // 输出订阅信息。
    }
    if (order.invoice) { // 若订单已有发票。
      console.log(`  发票ID=${order.invoice.id} 发票状态=${order.invoice.status}`); // 输出发票信息。
    }
  }
}

main()
  .catch((error) => { // 捕获异常，避免脚本 silent fail。
    console.error('[report] 查询支付订单失败', error); // 输出错误日志。
    process.exitCode = 1; // 设置非零退出码以便 CI 检测。
  })
  .finally(async () => {
    await prisma.$disconnect(); // 关闭数据库连接，避免脚本挂起。
  });
