// 该文件测试支付订单号生成工具，确保前缀与长度符合预期。

import { describe, expect, it } from 'vitest'; // 引入 Vitest 核心 API。

import { generateOutTradeNo } from '../src/services/payment/order-number.js'; // 引入待测试函数。

describe('generateOutTradeNo', () => { // 定义测试套件。
  it('should include prefix and be unique', () => { // 检查是否包含前缀并具有一定唯一性。
    const resultA = generateOutTradeNo(); // 生成第一个订单号。
    const resultB = generateOutTradeNo(); // 生成第二个订单号。
    expect(resultA).not.toEqual(resultB); // 期望两个订单号不相等。
    expect(resultA.startsWith('PI')).toBe(true); // 默认前缀为 PI。
    expect(resultA.length).toBeGreaterThan(10); // 长度应足够长，以降低冲突概率。
  });
});
