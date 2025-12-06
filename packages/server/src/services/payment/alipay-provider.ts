// 该文件封装支付宝当面付/网页支付的预下单逻辑。

import AlipaySdk from 'alipay-sdk';

import { ensureAlipayConfig } from '../../config/payment.js';

export type AlipayPrepayResult = {
  qrCode: string;
  outTradeNo: string;
};

let cachedSdk: AlipaySdk | null = null;

export function getAlipaySdk(): AlipaySdk {
  const cfg = ensureAlipayConfig();
  if (cachedSdk) {
    return cachedSdk;
  }
  cachedSdk = new AlipaySdk({
    appId: cfg.appId,
    privateKey: cfg.privateKey,
    alipayPublicKey: cfg.publicKey,
    gateway: cfg.gateway,
    charset: 'utf-8',
    signType: 'RSA2' // 统一使用 RSA2
  });
  return cachedSdk;
}

export async function createPrecreateOrder(params: {
  outTradeNo: string;
  subject: string;
  amount: number;
}): Promise<AlipayPrepayResult> {
  const cfg = ensureAlipayConfig();
  const sdk = getAlipaySdk();
  const result = await sdk.exec('alipay.trade.precreate', {
    notify_url: cfg.notifyUrl,
    bizContent: {
      out_trade_no: params.outTradeNo,
      subject: params.subject,
      total_amount: (params.amount / 100).toFixed(2),
      timeout_express: '15m'
    }
  });
  if (!result || !result.qr_code) {
    throw new Error('[alipay] 预下单返回异常');
  }
  return {
    qrCode: result.qr_code,
    outTradeNo: params.outTradeNo
  };
}
