// 该文件封装支付宝支付异步通知的签名校验。

import { getAlipaySdk } from './alipay-provider.js';

export function verifyAlipayNotify(payload: Record<string, string>): void {
  const sdk = getAlipaySdk();
  const valid = sdk.checkNotifySign(payload);
  if (!valid) {
    throw new Error('支付宝回调签名验证失败');
  }
}
