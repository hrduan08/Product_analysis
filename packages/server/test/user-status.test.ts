import { describe, expect, it } from 'vitest';

import { shouldUpdateStatusToPastDue } from '../src/services/auth/auth-service.js';

const NOW = new Date('2025-01-01T00:00:00Z');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('shouldUpdateStatusToPastDue', () => {
  it('returns false when trial remains active', () => {
    const result = shouldUpdateStatusToPastDue(
      {
        status: 'trialing',
        trial_ends_at: new Date(NOW.getTime() + ONE_DAY_MS),
        plan_id: null,
        plan_expire_at: null
      },
      NOW
    );
    expect(result).toBe(false);
  });

  it('returns true when trial already ended', () => {
    const result = shouldUpdateStatusToPastDue(
      {
        status: 'trialing',
        trial_ends_at: new Date(NOW.getTime() - ONE_DAY_MS),
        plan_id: null,
        plan_expire_at: null
      },
      NOW
    );
    expect(result).toBe(true);
  });

  it('returns false when paid plan still valid', () => {
    const result = shouldUpdateStatusToPastDue(
      {
        status: 'active',
        trial_ends_at: new Date(NOW.getTime() - ONE_DAY_MS),
        plan_id: 'pro',
        plan_expire_at: new Date(NOW.getTime() + ONE_DAY_MS)
      },
      NOW
    );
    expect(result).toBe(false);
  });

  it('returns true when paid plan expired', () => {
    const result = shouldUpdateStatusToPastDue(
      {
        status: 'active',
        trial_ends_at: new Date(NOW.getTime() - ONE_DAY_MS),
        plan_id: 'pro',
        plan_expire_at: new Date(NOW.getTime() - ONE_DAY_MS)
      },
      NOW
    );
    expect(result).toBe(true);
  });
});
