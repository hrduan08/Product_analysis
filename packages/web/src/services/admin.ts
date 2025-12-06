import { API_BASE } from './api';

export type AdminPayment = {
  id: string;
  out_trade_no: string;
  status: string;
  provider: string;
  amount_cents: number;
  updated_at: string;
  plan?: { name: string } | null;
  user?: { email: string } | null;
};

export type AdminSubscription = {
  id: string;
  status: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  plan?: { name: string } | null;
  user?: { email: string } | null;
};

export type AdminAlert = {
  id: string;
  dedupe_key: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  source: string | null;
  tags: string[];
  occurrences: number;
  lastTriggeredAt: string;
  lastNotifiedAt: string | null;
  payload: unknown;
};

export type AdminUserInfo = {
  id: string;
  email: string;
  nickname: string | null;
  createdAt: string;
  membershipLabel: string;
  membershipExpireAt: string | null;
};

function buildHeaders(token: string) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['x-admin-token'] = token;
  }
  return headers;
}

export async function fetchAdminPayments(params: { status?: string; userId?: string; token: string }): Promise<{ orders: AdminPayment[] }> {
  const query = params.status ? `?status=${encodeURIComponent(params.status)}` : '';
  const response = await fetch(`${API_BASE}/api/admin/payments${query}`, {
    headers: buildHeaders(params.token)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as { orders: AdminPayment[] };
}

export async function retryAdminPayment(params: { orderId: string; token: string }): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/payments/${params.orderId}/retry`, {
    method: 'POST',
    headers: buildHeaders(params.token)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function fetchAdminSubscriptions(params: { token: string }): Promise<{ subscriptions: AdminSubscription[] }> {
  const response = await fetch(`${API_BASE}/api/admin/subscriptions`, {
    headers: buildHeaders(params.token)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as { subscriptions: AdminSubscription[] };
}

export async function expireAdminPayment(params: { orderId: string; token: string; reason?: string }): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/payments/${params.orderId}/expire`, {
    method: 'POST',
    headers: buildHeaders(params.token),
    body: JSON.stringify({ reason: params.reason })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function failAdminPayment(params: { orderId: string; token: string; reason?: string }): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/payments/${params.orderId}/fail`, {
    method: 'POST',
    headers: buildHeaders(params.token),
    body: JSON.stringify({ reason: params.reason })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function confirmAdminPayment(params: { orderId: string; token: string }): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/payments/${params.orderId}/confirm`, {
    method: 'POST',
    headers: buildHeaders(params.token)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function fetchAdminAlerts(params: { token: string; severity?: string }): Promise<{ alerts: AdminAlert[] }> {
  const query = params.severity ? `?severity=${encodeURIComponent(params.severity)}` : '';
  const response = await fetch(`${API_BASE}/api/admin/alerts${query}`, {
    headers: buildHeaders(params.token)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as { alerts: AdminAlert[] };
}

export async function fetchAdminUsers(params: { token: string }): Promise<{ users: AdminUserInfo[] }> {
  const response = await fetch(`${API_BASE}/api/admin/users`, {
    headers: buildHeaders(params.token)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as { users: AdminUserInfo[] };
}
