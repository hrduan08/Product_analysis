// 该测试文件验证套餐配额解析逻辑是否符合预期。

import { describe, expect, it } from 'vitest'; // 引入 Vitest 测试工具。

import { parsePlanLimits, planAllowsNotification } from '../src/services/billing/limits.js'; // 引入待测试的配额解析方法。

describe('parsePlanLimits', () => { // 定义测试套件。
  it('returns default notifications when limits missing', () => { // 测试缺失 limits 时的默认行为。
    const limits = parsePlanLimits({ limits: null }); // 调用解析函数。
    expect(limits.notifications).toEqual(['email']); // 期望默认允许 email。
    expect(limits.keywords).toBeUndefined(); // 未设置关键词限制。
  });

  it('parses keyword/member limits and notifications', () => { // 测试完整 limits 解析。
    const limits = parsePlanLimits({
      limits: {
        keywords: 5,
        members: 'unlimited',
        notifications: ['email', 'slack'],
        exports: true
      }
    });
    expect(limits.keywords).toBe(5); // 应解析出关键词数量。
    expect(limits.members).toBe('unlimited'); // 应保持 unlimited 字段。
    expect(limits.notifications).toEqual(['email', 'slack']); // 应解析通知渠道。
    expect(limits.exports).toBe(true); // 应解析导出权限。
  });
});

describe('planAllowsNotification', () => { // 测试通知渠道校验逻辑。
  it('returns true when channel included', () => {
    const limits = parsePlanLimits({ limits: { notifications: ['email', 'webhook'] } });
    expect(planAllowsNotification(limits, 'email')).toBe(true); // email 在列表中，返回 true。
  });

  it('returns false when channel missing', () => {
    const limits = parsePlanLimits({ limits: { notifications: ['webhook'] } });
    expect(planAllowsNotification(limits, 'email')).toBe(false); // 列表中没有 email，返回 false。
  });
});
