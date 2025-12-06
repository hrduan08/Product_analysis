import type { TokenPair, User } from '../types/auth';
export type Plan = {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    price_cents: number;
    currency: string;
    billing_interval: 'monthly' | 'yearly';
    limits?: unknown;
    metadata?: unknown;
};
export type PlanLimits = {
    keywords?: number | 'unlimited';
    members?: number | 'unlimited';
    notifications: string[];
    exports?: boolean;
};
export type SubscriptionRecord = {
    id: string;
    status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
    plan_id: string;
    user_id: string;
    started_at: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    canceled_at?: string | null;
    trial_ends_at?: string | null;
    plan?: Plan | null;
};
export type InvoiceRecord = {
    id: string;
    subscription_id?: string | null;
    user_id: string;
    plan_id?: string | null;
    amount_cents: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    description?: string | null;
    issued_at: string;
    due_at?: string | null;
    paid_at?: string | null;
};
export declare function fetchPlans(): Promise<Plan[]>;
export declare function fetchSubscription(userId: string): Promise<{
    subscription: SubscriptionRecord | null;
    invoices: InvoiceRecord[];
    plan: Plan | null;
    limits: PlanLimits | null;
    user: {
        status: string;
        trialStartedAt: string | null;
        trialEndsAt: string | null;
        planExpireAt: string | null;
    };
}>;
export declare function createSubscriptionRequest(params: {
    userId: string;
    planCode: string;
    note?: string;
}): Promise<{
    user: User;
    subscription: SubscriptionRecord;
    invoice: InvoiceRecord;
    limits: PlanLimits;
    tokens?: TokenPair;
}>;
