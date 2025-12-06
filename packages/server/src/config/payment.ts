// 该文件解析支付所需的配置（微信/支付宝），供支付服务使用。

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[payment] missing environment variable ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function readKeyFile(maybePath: string | undefined): string | undefined {
  if (!maybePath) return undefined;
  const fullPath = resolve(process.cwd(), maybePath);
  if (!existsSync(fullPath)) {
    throw new Error(`[payment] key file not found: ${fullPath}`);
  }
  return readFileSync(fullPath, 'utf8');
}

export const paymentConfig = {
  orderPrefix: process.env.PAYMENT_ORDER_PREFIX ?? 'PI',
  orderExpireMinutes: Number(process.env.PAYMENT_EXPIRE_MINUTES ?? '15'),
  personalWechat: {
    qrUrl: optional('WECHAT_PERSONAL_QR_URL'),
    tips: optional('WECHAT_PERSONAL_TIPS'),
    supportQrUrl: optional('WECHAT_SUPPORT_QR_URL'),
    orderExpireMinutes: Number(process.env.WECHAT_PERSONAL_EXPIRE_MINUTES ?? '1440')
  },
  // 微信支付配置
  wechat: {
    mchid: optional('WECHAT_PAY_MCHID'),
    appid: optional('WECHAT_PAY_APPID'),
    serialNo: optional('WECHAT_PAY_SERIAL'),
    privateKey: readKeyFile(optional('WECHAT_PAY_PRIVATE_KEY_PATH')),
    apiV3Key: optional('WECHAT_PAY_API_V3_KEY'),
    notifyUrl: optional('WECHAT_PAY_NOTIFY_URL'),
    platformCert: readKeyFile(optional('WECHAT_PAY_PLATFORM_CERT_PATH'))
  },
  // 支付宝配置
  alipay: {
    appId: optional('ALIPAY_APP_ID'),
    privateKey: readKeyFile(optional('ALIPAY_PRIVATE_KEY_PATH')),
    publicKey: readKeyFile(optional('ALIPAY_PUBLIC_KEY_PATH')),
    gateway: process.env.ALIPAY_GATEWAY ?? 'https://openapi.alipay.com/gateway.do',
    notifyUrl: optional('ALIPAY_NOTIFY_URL')
  }
};

export function ensureWechatConfig(): Required<typeof paymentConfig.wechat> {
  return {
    mchid: required('WECHAT_PAY_MCHID'),
    appid: required('WECHAT_PAY_APPID'),
    serialNo: required('WECHAT_PAY_SERIAL'),
    privateKey: readKeyFile(required('WECHAT_PAY_PRIVATE_KEY_PATH'))!,
    apiV3Key: required('WECHAT_PAY_API_V3_KEY'),
    notifyUrl: required('WECHAT_PAY_NOTIFY_URL'),
    platformCert: paymentConfig.wechat.platformCert
  };
}

export function ensureAlipayConfig(): Required<typeof paymentConfig.alipay> {
  return {
    appId: required('ALIPAY_APP_ID'),
    privateKey: readKeyFile(required('ALIPAY_PRIVATE_KEY_PATH'))!,
    publicKey: readKeyFile(required('ALIPAY_PUBLIC_KEY_PATH'))!,
    gateway: paymentConfig.alipay.gateway,
    notifyUrl: required('ALIPAY_NOTIFY_URL')
  };
}

export function getMissingWechatFields(): string[] {
  const cfg = paymentConfig.wechat;
  return [
    !cfg.mchid && 'WECHAT_PAY_MCHID',
    !cfg.appid && 'WECHAT_PAY_APPID',
    !cfg.serialNo && 'WECHAT_PAY_SERIAL',
    !cfg.privateKey && 'WECHAT_PAY_PRIVATE_KEY_PATH',
    !cfg.apiV3Key && 'WECHAT_PAY_API_V3_KEY',
    !cfg.notifyUrl && 'WECHAT_PAY_NOTIFY_URL',
    !cfg.platformCert && 'WECHAT_PAY_PLATFORM_CERT_PATH'
  ].filter(Boolean) as string[];
}

export function getMissingAlipayFields(): string[] {
  const cfg = paymentConfig.alipay;
  return [
    !cfg.appId && 'ALIPAY_APP_ID',
    !cfg.privateKey && 'ALIPAY_PRIVATE_KEY_PATH',
    !cfg.publicKey && 'ALIPAY_PUBLIC_KEY_PATH',
    !cfg.notifyUrl && 'ALIPAY_NOTIFY_URL'
  ].filter(Boolean) as string[];
}

export function getMissingPersonalWechatFields(): string[] {
  const cfg = paymentConfig.personalWechat;
  return [!cfg.qrUrl && 'WECHAT_PERSONAL_QR_URL'].filter(Boolean) as string[];
}

export function isWechatConfigured(): boolean {
  return getMissingWechatFields().length === 0;
}

export function isAlipayConfigured(): boolean {
  return getMissingAlipayFields().length === 0;
}

export function isPersonalWechatConfigured(): boolean {
  return getMissingPersonalWechatFields().length === 0;
}
