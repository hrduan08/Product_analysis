// 该文件封装微信/支付宝的查单接口，用于失败重试或对账。

import { ensureWechatConfig } from '../../config/payment.js';
import { getAlipaySdk } from './alipay-provider.js';
import Wechatpay from 'wechatpay-node-v3';

let cachedWechatQueryClient: Wechatpay | null = null;

function getWechatQueryClient(): Wechatpay {
  if (cachedWechatQueryClient) {
    return cachedWechatQueryClient;
  }
  const cfg = ensureWechatConfig();
  cachedWechatQueryClient = new Wechatpay({
    mchid: cfg.mchid,
    publicKey: cfg.platformCert ?? '',
    privateKey: cfg.privateKey,
    serial: cfg.serialNo,
    certs: {},
    validator: () => true
  });
  return cachedWechatQueryClient;
}

export async function queryWechatTransaction(outTradeNo: string): Promise<{ trade_state: string; transaction_id?: string }> {
  const cfg = ensureWechatConfig();
  const client = getWechatQueryClient();
  const result = await client.transactions.outTradeNumber({
    mchid: cfg.mchid,
    out_trade_no: outTradeNo
  } as any);
  return result as { trade_state: string; transaction_id?: string };
}

export async function queryAlipayTransaction(outTradeNo: string): Promise<{ trade_status: string; trade_no?: string }> {
  const sdk = getAlipaySdk();
  const result = await sdk.exec('alipay.trade.query', {
    bizContent: {
      out_trade_no: outTradeNo
    }
  });
  return result as { trade_status: string; trade_no?: string };
}
