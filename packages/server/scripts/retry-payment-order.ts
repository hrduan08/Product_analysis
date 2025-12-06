// 该脚本用于手动重试支付订单：会调用第三方查单接口并根据结果更新订单状态。

import { queryAlipayTransaction, queryWechatTransaction } from '../src/services/payment/provider-query.js';
import { prisma } from '../src/db/prisma.js';
import { markOrderExpired, markOrderFailed, markOrderPaid } from '../src/services/payment/payment-service.js';

const orderId = process.argv[2];

async function main(): Promise<void> {
  if (!orderId) {
    console.error('用法: pnpm --filter server retry:payment <orderId>');
    process.exitCode = 1;
    return;
  }
  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    console.error('订单不存在');
    process.exitCode = 1;
    return;
  }
  if (order.status !== 'pending') {
    console.log(`订单当前状态=${order.status}，无需重试`);
    return;
  }
  console.log(`开始查询订单 ${order.id}（${order.provider}，out_trade_no=${order.out_trade_no}）`);
  try {
    if (order.provider === 'wechat') {
      const result = await queryWechatTransaction(order.out_trade_no);
      console.log('微信查单结果', result);
      if (result.trade_state === 'SUCCESS') {
        await markOrderPaid({ outTradeNo: order.out_trade_no, provider: 'wechat', externalTradeNo: result.transaction_id, notifyPayload: result });
        console.log('已更新为成功');
      } else if (['NOTPAY', 'USERPAYING'].includes(result.trade_state)) {
        console.log('订单仍在支付中，可稍后重试');
      } else {
        await markOrderFailed({ outTradeNo: order.out_trade_no, provider: 'wechat', reason: result.trade_state, notifyPayload: result });
        console.log('已标记为失败');
      }
    } else if (order.provider === 'alipay') {
      const result = await queryAlipayTransaction(order.out_trade_no);
      console.log('支付宝查单结果', result);
      if (result.trade_status === 'TRADE_SUCCESS') {
        await markOrderPaid({ outTradeNo: order.out_trade_no, provider: 'alipay', externalTradeNo: result.trade_no, notifyPayload: result });
        console.log('已更新为成功');
      } else if (['WAIT_BUYER_PAY'].includes(result.trade_status)) {
        console.log('订单仍在支付中，可稍后重试');
      } else if (['TRADE_FINISHED'].includes(result.trade_status)) {
        console.log('交易已完结，通常表示已支付');
      } else {
        await markOrderFailed({ outTradeNo: order.out_trade_no, provider: 'alipay', reason: result.trade_status, notifyPayload: result });
        console.log('已标记为失败');
      }
    } else {
      console.log('mock provider 不支持查单');
    }
  } catch (error) {
    console.error('查询失败', error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
