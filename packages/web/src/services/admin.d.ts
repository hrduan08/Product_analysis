export type AdminPayment = {
    id: string;
    out_trade_no: string;
    status: string;
    provider: string;
    amount_cents: number;
    updated_at: string;
    plan?: {
        name: string;
    } | null;
    user?: {
        email: string;
    } | null;
};
export type AdminSubscription = {
    id: string;
    status: string;
    current_period_end: string | null;
    trial_ends_at: string | null;
    plan?: {
        name: string;
    } | null;
    user?: {
        email: string;
    } | null;
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
export declare function fetchAdminPayments(params: {
    status?: string;
    userId?: string;
    token: string;
}): Promise<{
    orders: AdminPayment[];
}>;
export declare function retryAdminPayment(params: {
    orderId: string;
    token: string;
}): Promise<void>;
export declare function fetchAdminSubscriptions(params: {
    token: string;
}): Promise<{
    subscriptions: AdminSubscription[];
}>;
export declare function expireAdminPayment(params: {
    orderId: string;
    token: string;
    reason?: string;
}): Promise<void>;
export declare function failAdminPayment(params: {
    orderId: string;
    token: string;
    reason?: string;
}): Promise<void>;
export declare function confirmAdminPayment(params: {
    orderId: string;
    token: string;
}): Promise<void>;
export declare function fetchAdminAlerts(params: {
    token: string;
    severity?: string;
}): Promise<{
    alerts: AdminAlert[];
}>;
export declare function fetchAdminUsers(params: {
    token: string;
}): Promise<{
    users: AdminUserInfo[];
}>;
