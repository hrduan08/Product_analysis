// 该文件封装与订阅计费相关的 API 请求，供前端页面调用以获取套餐和订阅信息。

import { API_BASE } from './api'; // 引入后端基础地址常量，用于拼接 API 请求路径。
import type { TokenPair, User } from '../types/auth'; // 引入用户和 token 类型，用于请求返回值类型声明。

// 定义套餐数据结构，描述从后端获取的套餐字段。
export type Plan = { // 声明 Plan 类型用于后续函数返回类型。
  id: string; // 套餐唯一 ID。
  code: string; // 套餐编码，可用于创建订阅。
  name: string; // 套餐名称。
  description?: string | null; // 套餐描述。
  price_cents: number; // 套餐价格（分）。
  currency: string; // 货币类型。
  billing_interval: 'monthly' | 'yearly'; // 计费周期。
  limits?: unknown; // 限额信息，保持未知以兼容后端 JSON。
  metadata?: unknown; // 其他元数据。
}; // 结束 Plan 类型描述。

export type PlanLimits = { // 订阅套餐配额结构，便于前端展示。
  keywords?: number | 'unlimited'; // 允许的关键词数量。
  members?: number | 'unlimited'; // 可添加的团队成员数量。
  notifications: string[]; // 启用的通知渠道列表。
  exports?: boolean; // 是否允许导出数据。
}; // 结束 PlanLimits 定义。

// 定义订阅记录类型，映射后端返回的订阅实体。
export type SubscriptionRecord = { // 声明订阅类型。
  id: string; // 订阅 ID。
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'; // 当前订阅状态。
  plan_id: string; // 关联的套餐 ID。
  user_id: string; // 关联的用户 ID。
  started_at: string; // 订阅开始时间。
  current_period_start: string; // 当前计费周期起始。
  current_period_end: string; // 当前计费周期结束。
  cancel_at_period_end: boolean; // 是否将在周期末取消。
  canceled_at?: string | null; // 取消时间。
  trial_ends_at?: string | null; // 试用结束时间。
  plan?: Plan | null; // 关联套餐详情（后端 include 返回）。
}; // 结束订阅类型。

// 定义发票记录类型，映射后端返回的发票实体。
export type InvoiceRecord = { // 声明发票类型。
  id: string; // 发票 ID。
  subscription_id?: string | null; // 关联订阅 ID。
  user_id: string; // 关联用户 ID。
  plan_id?: string | null; // 关联套餐 ID。
  amount_cents: number; // 金额（分）。
  currency: string; // 货币类型。
  status: 'pending' | 'paid' | 'failed' | 'refunded'; // 发票状态。
  description?: string | null; // 描述信息。
  issued_at: string; // 开票时间。
  due_at?: string | null; // 到期时间。
  paid_at?: string | null; // 支付时间。
}; // 结束发票类型。

// 定义获取套餐列表的函数。
export async function fetchPlans(): Promise<Plan[]> { // 异步函数返回 Plan 数组。
  const response = await fetch(`${API_BASE}/api/billing/plans`); // 调用套餐列表接口。
  if (!response.ok) { // 如果返回状态非 200。
    throw new Error('获取套餐列表失败'); // 抛出错误提示调用方。
  }
  const data = (await response.json()) as { plans: Plan[] }; // 解析 JSON 并显式声明响应类型。
  return data.plans; // 返回套餐数组。
} // 结束函数定义。

// 定义获取用户订阅、发票的函数。
export async function fetchSubscription(userId: string): Promise<{ subscription: SubscriptionRecord | null; invoices: InvoiceRecord[]; plan: Plan | null; limits: PlanLimits | null; user: { status: string; trialStartedAt: string | null; trialEndsAt: string | null; planExpireAt: string | null } }> { // 声明返回订阅、发票以及配额和用户状态的函数。
  const response = await fetch(`${API_BASE}/api/billing/subscription?userId=${encodeURIComponent(userId)}`); // 调用接口并传递用户 ID。
  if (!response.ok) { // 检查响应状态。
    throw new Error('获取订阅信息失败'); // 抛出错误提示调用方。
  }
  const data = (await response.json()) as { subscription: SubscriptionRecord | null; invoices: InvoiceRecord[]; plan: Plan | null; limits: PlanLimits | null; user: { status: string; trialStartedAt: string | null; trialEndsAt: string | null; planExpireAt: string | null } }; // 解析 JSON 包含订阅、发票、套餐和配额。
  return data; // 返回解析结果。
} // 结束函数定义。

// 定义创建订阅（模拟支付）的函数。
export async function createSubscriptionRequest(params: { userId: string; planCode: string; note?: string }): Promise<{ user: User; subscription: SubscriptionRecord; invoice: InvoiceRecord; limits: PlanLimits; tokens?: TokenPair }> { // 声明创建订阅函数返回值类型（包含配额信息）。
  const response = await fetch(`${API_BASE}/api/billing/subscription`, { // 调用后端订阅创建接口。
    method: 'POST', // 指定 POST 方法。
    headers: { 'Content-Type': 'application/json' }, // 设置请求头为 JSON。
    body: JSON.stringify(params) // 将参数序列化为 JSON 字符串。
  }); // 结束 fetch 调用。
  if (!response.ok) { // 判断请求是否成功。
    const errorBody = await response.text(); // 读取错误提示文本。
    throw new Error(errorBody || '创建订阅失败'); // 抛出错误信息。
  }
  const data = (await response.json()) as { user: User; subscription: SubscriptionRecord; invoice: InvoiceRecord; limits: PlanLimits; tokens?: TokenPair }; // 解析返回的 JSON，其中包含配额信息。
  return data; // 返回创建结果给调用方。
} // 结束函数定义。
