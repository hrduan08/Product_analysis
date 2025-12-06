import { API_BASE } from './api';
export async function createPaymentCheckout(params) {
    const response = await fetch(`${API_BASE}/api/billing/payments/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || '创建支付订单失败');
    }
    return (await response.json());
}
export async function fetchPaymentStatus(orderId) {
    const response = await fetch(`${API_BASE}/api/billing/payments/${orderId}`);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || '查询支付状态失败');
    }
    return (await response.json());
}
export async function fetchPaymentProviders() {
    const response = await fetch(`${API_BASE}/api/billing/payments/providers`);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || '获取支付方式配置失败');
    }
    const data = (await response.json());
    return data.providers;
}
