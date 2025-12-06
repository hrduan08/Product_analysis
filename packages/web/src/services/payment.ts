import { API_BASE } from './api';

export type PaymentProvider = 'wechat' | 'alipay' | 'wechat_personal' | 'mock';

export type CheckoutResult = {
  orderId: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'canceled' | 'expired';
  provider: PaymentProvider;
  amount: number;
  currency: string;
  outTradeNo: string;
  expiresAt: string | null;
  plan: { id: string; name: string; description?: string | null };
  wechat?: { codeUrl: string };
  alipay?: { qrCode: string };
  mock?: { paymentUrl: string };
  personalWechat?: { qrUrl: string; tips?: string; supportQrUrl?: string };
};

export type PaymentProviderStatus = {
  provider: PaymentProvider;
  enabled: boolean;
  missing: string[];
};

export type PaymentStatusResponse = {
  orderId: string;
  status: CheckoutResult['status'];
  provider: PaymentProvider;
  amount: number;
  currency: string;
  outTradeNo: string;
  paidAt: string | null;
  expiresAt: string | null;
  subscriptionId: string | null;
  plan: { id: string; name: string };
};

export async function createPaymentCheckout(params: {
  userId: string;
  planCode: string;
  provider: PaymentProvider;
}): Promise<CheckoutResult> {
  const response = await fetch(`${API_BASE}/api/billing/payments/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || '创建支付订单失败');
  }
  return (await response.json()) as CheckoutResult;
}

export async function fetchPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
  const response = await fetch(`${API_BASE}/api/billing/payments/${orderId}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || '查询支付状态失败');
  }
  return (await response.json()) as PaymentStatusResponse;
}

export async function fetchPaymentProviders(): Promise<PaymentProviderStatus[]> {
  const response = await fetch(`${API_BASE}/api/billing/payments/providers`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || '获取支付方式配置失败');
  }
  const data = (await response.json()) as { providers: PaymentProviderStatus[] };
  return data.providers;
}
