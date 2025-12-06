export type PaymentProvider = 'wechat' | 'alipay' | 'wechat_personal' | 'mock';
export type CheckoutResult = {
    orderId: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'canceled' | 'expired';
    provider: PaymentProvider;
    amount: number;
    currency: string;
    outTradeNo: string;
    expiresAt: string | null;
    plan: {
        id: string;
        name: string;
        description?: string | null;
    };
    wechat?: {
        codeUrl: string;
    };
    alipay?: {
        qrCode: string;
    };
    mock?: {
        paymentUrl: string;
    };
    personalWechat?: {
        qrUrl: string;
        tips?: string;
        supportQrUrl?: string;
    };
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
    plan: {
        id: string;
        name: string;
    };
};
export declare function createPaymentCheckout(params: {
    userId: string;
    planCode: string;
    provider: PaymentProvider;
}): Promise<CheckoutResult>;
export declare function fetchPaymentStatus(orderId: string): Promise<PaymentStatusResponse>;
export declare function fetchPaymentProviders(): Promise<PaymentProviderStatus[]>;
