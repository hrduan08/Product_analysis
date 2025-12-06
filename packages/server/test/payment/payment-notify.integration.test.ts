import { beforeEach, describe, expect, it, vi } from 'vitest';

let orderState: {
  status: string;
  retry_count: number;
  notify_payload: unknown;
  last_error: string | null;
  description: string | null;
  subscription_id: string | null;
};

const mockFns = vi.hoisted(() => ({
  paymentOrderFindUnique: vi.fn(),
  paymentOrderUpdate: vi.fn(),
  planFindUnique: vi.fn(),
  invoiceUpdate: vi.fn(),
  createSubscription: vi.fn(),
  notifyAlert: vi.fn()
}));

vi.mock('../../src/db/prisma.js', async () => {
  const { paymentOrderFindUnique, paymentOrderUpdate, planFindUnique, invoiceUpdate } = mockFns;
  return {
    prisma: {
      paymentOrder: {
        findUnique: paymentOrderFindUnique,
        update: paymentOrderUpdate
      },
      plan: {
        findUnique: planFindUnique
      },
      invoice: {
        update: invoiceUpdate
      }
    }
  };
});

vi.mock('../../src/services/billing/subscription-service.js', () => ({
  createSubscription: mockFns.createSubscription
}));

vi.mock('../../src/services/alert/notifier.js', () => ({
  notifyAlert: mockFns.notifyAlert
}));

const {
  paymentOrderFindUnique,
  paymentOrderUpdate,
  planFindUnique,
  invoiceUpdate,
  createSubscription,
  notifyAlert
} = mockFns;

// eslint-disable-next-line import/first
import { markOrderPaid } from '../../src/services/payment/payment-service.js';

describe('payment-service markOrderPaid', () => {
  beforeEach(() => {
    orderState = {
      status: 'pending',
      retry_count: 0,
      notify_payload: null,
      last_error: null,
      description: null,
      subscription_id: null
    };
    paymentOrderFindUnique.mockReset();
    paymentOrderUpdate.mockReset();
    planFindUnique.mockReset();
    invoiceUpdate.mockReset();
    createSubscription.mockReset();
    notifyAlert.mockReset();

    paymentOrderFindUnique.mockImplementation(async (args: any) => {
      const where = args.where ?? {};
      if (where.out_trade_no === 'ORDER123' || where.id === 'order-1') {
        return {
          id: 'order-1',
          out_trade_no: 'ORDER123',
          user_id: 'user-1',
          plan_id: 'plan-1',
          provider: 'wechat',
          amount_cents: 19900,
          expires_at: null,
          ...orderState
        };
      }
      return null;
    });

    planFindUnique.mockResolvedValue({
      id: 'plan-1',
      code: 'pro',
      name: 'Pro',
      description: null,
      price_cents: 19900
    });

    paymentOrderUpdate.mockImplementation(async ({ data }: any) => {
      if (data.status) {
        orderState.status = data.status;
      }
      if (typeof data.retry_count === 'number') {
        orderState.retry_count = data.retry_count;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'notify_payload')) {
        orderState.notify_payload = data.notify_payload;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'last_error')) {
        orderState.last_error = data.last_error ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'description')) {
        orderState.description = data.description ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'subscription_id')) {
        orderState.subscription_id = data.subscription_id ?? null;
      }
      return {
        id: 'order-1',
        out_trade_no: 'ORDER123',
        amount_cents: 19900,
        provider: 'wechat',
        ...orderState
      };
    });

    invoiceUpdate.mockResolvedValue({ id: 'invoice-1' });
    createSubscription.mockResolvedValue({
      subscription: { id: 'sub-1', plan: { id: 'plan-1', code: 'pro', name: 'Pro' } },
      invoice: { id: 'invoice-1' },
      user: { id: 'user-1' }
    });
    notifyAlert.mockResolvedValue(undefined);
  });

  it('marks order paid and triggers subscription once', async () => {
    await markOrderPaid({
      outTradeNo: 'ORDER123',
      provider: 'wechat',
      externalTradeNo: 'TRANSACTION123',
      notifyPayload: { foo: 'bar' },
      amountCents: 19900
    });

    expect(paymentOrderUpdate).toHaveBeenCalledTimes(2);
    expect(createSubscription).toHaveBeenCalledTimes(1);
    expect(invoiceUpdate).toHaveBeenCalledTimes(1);
    expect(orderState.status).toBe('paid');
    expect(orderState.subscription_id).toBe('sub-1');
  });

  it('ignores duplicate paid notification', async () => {
    await markOrderPaid({
      outTradeNo: 'ORDER123',
      provider: 'wechat',
      externalTradeNo: 'TRANSACTION123',
      notifyPayload: { attempt: 1 },
      amountCents: 19900
    });

    await markOrderPaid({
      outTradeNo: 'ORDER123',
      provider: 'wechat',
      externalTradeNo: 'TRANSACTION123',
      notifyPayload: { attempt: 2 },
      amountCents: 19900
    });

    expect(paymentOrderUpdate).toHaveBeenCalledTimes(2);
    expect(createSubscription).toHaveBeenCalledTimes(1);
    expect(orderState.status).toBe('paid');
  });

  it('flags order when amount mismatches and sends alert', async () => {
    await markOrderPaid({
      outTradeNo: 'ORDER123',
      provider: 'wechat',
      externalTradeNo: 'TRANSACTION123',
      notifyPayload: { mismatch: true },
      amountCents: 100
    });

    expect(paymentOrderUpdate).toHaveBeenCalledTimes(1);
    expect(orderState.status).toBe('failed');
    expect(orderState.last_error).toBe('AMOUNT_MISMATCH');
    expect(createSubscription).not.toHaveBeenCalled();
    expect(invoiceUpdate).not.toHaveBeenCalled();
    expect(notifyAlert).toHaveBeenCalledWith(
      '支付金额不一致',
      expect.objectContaining({
        expectedAmount: 19900,
        receivedAmount: 100
      }),
      expect.objectContaining({
        severity: 'critical',
        dedupeKey: expect.stringContaining('payment:amount-mismatch')
      })
    );
  });
});
