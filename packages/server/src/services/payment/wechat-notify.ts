// 该文件负责微信支付回调的验签与解密逻辑。

import crypto from 'node:crypto';

import { ensureWechatConfig } from '../../config/payment.js';

function getHeader(headers: Record<string, unknown>, name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === 'string' ? value : undefined;
}

function decryptResource(resource: {
  ciphertext: string;
  nonce: string;
  associated_data?: string;
}): string {
  const cfg = ensureWechatConfig();
  const key = Buffer.from(cfg.apiV3Key, 'utf8');
  const nonce = resource.nonce;
  const associatedData = resource.associated_data ?? '';
  const buffer = Buffer.from(resource.ciphertext, 'base64');
  const authTag = buffer.slice(buffer.length - 16);
  const data = buffer.slice(0, buffer.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);
  if (associatedData) {
    decipher.setAAD(Buffer.from(associatedData));
  }
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

export function verifyAndParseWechatNotify(headers: Record<string, unknown>, rawBody: string, body: any): any {
  const cfg = ensureWechatConfig();
  const signature = getHeader(headers, 'Wechatpay-Signature');
  const timestamp = getHeader(headers, 'Wechatpay-Timestamp');
  const nonce = getHeader(headers, 'Wechatpay-Nonce');
  const serial = getHeader(headers, 'Wechatpay-Serial');

  if (!signature || !timestamp || !nonce || !serial) {
    throw new Error('缺少微信回调签名头');
  }

  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(message);
  verifier.end();

  if (!cfg.platformCert) {
    throw new Error('未配置微信平台证书，无法验签');
  }
  const verified = verifier.verify(cfg.platformCert, signature, 'base64');
  if (!verified) {
    throw new Error('微信回调签名验证失败');
  }

  if (body?.resource?.ciphertext) {
    const decrypted = decryptResource(body.resource);
    const parsed = JSON.parse(decrypted);
    return { ...body, resource: parsed, rawdata: decrypted };
  }

  return body;
}
