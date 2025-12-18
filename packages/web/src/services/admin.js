import { API_BASE } from './api';
function buildHeaders(token) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['x-admin-token'] = token;
    }
    return headers;
}
export async function fetchAdminPayments(params) {
    const query = params.status ? `?status=${encodeURIComponent(params.status)}` : '';
    const response = await fetch(`${API_BASE}/api/admin/payments${query}`, {
        headers: buildHeaders(params.token)
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    return (await response.json());
}
export async function retryAdminPayment(params) {
    const response = await fetch(`${API_BASE}/api/admin/payments/${params.orderId}/retry`, {
        method: 'POST',
        headers: buildHeaders(params.token)
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
}
export async function fetchAdminSubscriptions(params) {
    const response = await fetch(`${API_BASE}/api/admin/subscriptions`, {
        headers: buildHeaders(params.token)
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    return (await response.json());
}
export async function expireAdminPayment(params) {
    const response = await fetch(`${API_BASE}/api/admin/payments/${params.orderId}/expire`, {
        method: 'POST',
        headers: buildHeaders(params.token),
        body: JSON.stringify({ reason: params.reason })
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
}
export async function failAdminPayment(params) {
    const response = await fetch(`${API_BASE}/api/admin/payments/${params.orderId}/fail`, {
        method: 'POST',
        headers: buildHeaders(params.token),
        body: JSON.stringify({ reason: params.reason })
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
}
export async function confirmAdminPayment(params) {
    const response = await fetch(`${API_BASE}/api/admin/payments/${params.orderId}/confirm`, {
        method: 'POST',
        headers: buildHeaders(params.token)
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
}
export async function fetchAdminAlerts(params) {
    const query = params.severity ? `?severity=${encodeURIComponent(params.severity)}` : '';
    const response = await fetch(`${API_BASE}/api/admin/alerts${query}`, {
        headers: buildHeaders(params.token)
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    return (await response.json());
}
export async function fetchAdminUsers(params) {
    const response = await fetch(`${API_BASE}/api/admin/users`, {
        headers: buildHeaders(params.token)
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    return (await response.json());
}
