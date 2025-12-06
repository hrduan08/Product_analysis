import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../../src/db/prisma.js';
import { markOrderFailed } from '../../src/services/payment/payment-service.js';

vi.mock('../../src/services/alert/notifier.js', () => ({
  notifyAlert: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../src/db/prisma.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/db/prisma.js')>('../../src/db/prisma.js');
  return {
    prisma: {
      paymentOrder: {
        findUnique: vi.fn(async (args: any) => {
          if (args.where.out_trade_no === 'order_pending') {
            return {
              id: 'order_pending',
              out_trade_no: 'order_pending',
              status: 'pending',
              retry_count: 1,
              description: null
            };
          }
          if (args.where.out_trade_no === 'order_done') {
            return {
              id: 'order_done',
              out_trade_no: 'order_done',
              status: 'paid',
              retry_count: 0,
              description: null
            };
          }
          return null;
        }),
        update: vi.fn(async (args: any) => args)
      }
    }
  };
});

describe('payment-service markOrderFailed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks pending order as failed and increments retry count', async () => {
    await markOrderFailed({ outTradeNo: 'order_pending', provider: 'wechat', reason: 'SYSTEM_ERROR' });
    expect(prisma.paymentOrder.update).toHaveBeenCalledWith({
      where: { id: 'order_pending' },
      data: {
        status: 'failed',
        notify_payload: undefined,
        description: 'SYSTEM_ERROR',
        last_error: 'SYSTEM_ERROR',
        retry_count: 2
      }
    });
  });

  it('ignores non-pending order', async () => {
    await markOrderFailed({ outTradeNo: 'order_done', provider: 'wechat', reason: 'SYSTEM_ERROR' });
    expect(prisma.paymentOrder.update).not.toHaveBeenCalled();
  });
});
