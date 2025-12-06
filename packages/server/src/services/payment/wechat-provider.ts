// 该文件封装微信支付 v3 接口调用逻辑，当前支持 Native 扫码场景。

import Wechatpay from 'wechatpay-node-v3';

import { ensureWechatConfig } from '../../config/payment.js';

export type WechatPrepayResult = {
  codeUrl: string;
  prepayId: string;
  expireTime?: string;
};

const cachedClients: Map<string, Wechatpay> = new Map();

function getClient(): Wechatpay {
  const cfg = ensureWechatConfig();
  if (cachedClients.has(cfg.mchid)) {
    return cachedClients.get(cfg.mchid)!;
  }
  const client = new Wechatpay({
    mchid: cfg.mchid,
    publicKey: '',
    privateKey: cfg.privateKey,
    certs: {},
    serial: cfg.serialNo
  });
  cachedClients.set(cfg.mchid, client);
  return client;
}

export async function createNativeOrder(params: {
  outTradeNo: string;
  description: string;
  amount: number;
}): Promise<WechatPrepayResult> {
  const cfg = ensureWechatConfig();
  const client = getClient();
  const body = {
    mchid: cfg.mchid,
    appid: cfg.appid,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: cfg.notifyUrl,
    amount: {
      total: params.amount
    }
  };
  const result = await client.transactions.native(body as any);
  return {
    codeUrl: result.code_url,
    prepayId: result.prepay_id ?? '',
    expireTime: result.expire_time
  };
}
