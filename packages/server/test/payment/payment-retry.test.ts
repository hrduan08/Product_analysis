import { describe, expect, it, vi, beforeEach } from 'vitest';

import { prisma } from '../../src/db/prisma.js';
import { markOrderExpired, markOrderFailed } from '../../src/services/payment/payment-service.js';

vi.mock('../../src/services/alert/notifier.js', () => ({
  notifyAlert: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/db/prisma.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/db/prisma.js')>('../../src/db/prisma.js');
  return {
    prisma: {
      paymentOrder: {
        findUnique: vi.fn(async (args: any) => {
          if (args.where.id === 'pending') {
            return { id: 'pending', status: 'pending', retry_count: 1, notify_payload: null, out_trade_no: 'xxx', description: null };
          }
          if (args.where.out_trade_no === 'fail_trade') {
            return { id: 'fail_trade', status: 'pending', retry_count: 2, notify_payload: null, out_trade_no: 'fail_trade', description: null };
          }
          if (args.where.id === 'paid') {
            return { id: 'paid', status: 'paid', retry_count: 0, notify_payload: null, out_trade_no: 'xxx', description: null };
          }
          return null;
        }),
        update: vi.fn(async (args: any) => args)
      }
    }
  } as typeof import('../../src/db/prisma.js');
});

describe('payment retry helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('markOrderExpired updates pending order', async () => {
    await markOrderExpired('pending', 'TEST_EXPIRE');
    expect(prisma.paymentOrder.update).toHaveBeenCalledWith({
      where: { id: 'pending' },
      data: {
        status: 'expired',
        last_error: 'TEST_EXPIRE',
        retry_count: 2,
        notify_payload: null
      }
    });
  });

  it('markOrderExpired ignores non-pending order', async () => {
    await markOrderExpired('paid');
    expect(prisma.paymentOrder.update).not.toHaveBeenCalled();
  });

  it('markOrderFailed updates last_error and retry_count', async () => {
    await markOrderFailed({ outTradeNo: 'fail_trade', provider: 'wechat', reason: 'SYSTEM_ERROR' });
    expect(prisma.paymentOrder.update).toHaveBeenCalledWith({
      where: { id: 'fail_trade' },
      data: {
        status: 'failed',
        notify_payload: undefined,
        description: 'SYSTEM_ERROR',
        last_error: 'SYSTEM_ERROR',
        retry_count: 3
      }
    });
  });
});
