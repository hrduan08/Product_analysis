// 该文件封装用户订阅的创建、查询与状态同步逻辑，为路由层提供业务能力。

import { addMonths, addYears } from "date-fns"; // 引入 date-fns 工具函数计算订阅周期结束时间。
import type { Invoice, Plan, SubscriptionStatus, User, UserSubscription } from "../../generated/prisma/client.js"; // 引入相关 Prisma 类型以增强类型安全。
import { prisma } from "../../db/prisma.js"; // 引入 Prisma 客户端用于数据库读写。
import { createHttpError } from "../../utils/http-error.js"; // 引入自定义错误辅助函数，用于抛出带状态码的异常。
import { parsePlanLimits, planAllowsNotification, type PlanLimits } from "./limits.js"; // 引入套餐配额解析工具与类型定义。
import { ensureDailyQuotaCapacity } from "./quota-guard.js";
import { searchTierLimits } from "../../config/search-limits.js";

/**
 * 获取指定用户当前最新的订阅记录（如果存在）。
 */
export async function getLatestSubscription(userId: string): Promise<(UserSubscription & { plan: Plan | null }) | null> { // 暴露函数用于查询用户订阅，同时携带关联的套餐信息。
  const subscription = await prisma.userSubscription.findFirst({ // 在 user_subscriptions 表中查找记录。
    where: { user_id: userId }, // 根据用户 ID 过滤订阅。
    orderBy: { created_at: "desc" }, // 按创建时间倒序以获取最近一次订阅。
    include: { plan: true } // 关联查询套餐信息，便于获取 limits 与展示名称。
  }); // 执行查询得到结果或 null。
  return subscription; // 返回查询到的订阅。
}

/**
 * 为指定用户创建或更新订阅，并生成一条已支付发票（模拟支付）。
 */
export async function createSubscription(params: { userId: string; planCode: string; note?: string }): Promise<{ user: User; subscription: UserSubscription & { plan: Plan }; invoice: Invoice; limits: PlanLimits }> { // 暴露创建订阅函数，返回用户、订阅及配额信息。
  const { userId, planCode, note } = params; // 解构输入参数，获取用户 ID、套餐编码、备注。

  const plan = await prisma.plan.findUnique({ where: { code: planCode, is_active: true } }); // 根据套餐编码查询激活中的套餐。
  if (!plan) { // 如果未找到对应套餐。
    throw createHttpError(404, "未找到对应套餐"); // 抛出 404 错误提示套餐不存在。
  }
  const planLimits = parsePlanLimits(plan); // 解析套餐配额，用于后续校验。
  if (!planAllowsNotification(planLimits, "email")) { // 若当前系统所需的 email 通道未被允许。
    throw createHttpError(400, "当前套餐未启用邮箱通知，无法完成订阅"); // 抛出 400 错误提示套餐限制。
  }

  const user = await prisma.user.findUnique({ where: { id: userId } }); // 查询用户信息确认用户存在。
  if (!user) { // 如果用户不存在。
    throw createHttpError(404, "用户不存在"); // 抛出 404 错误。
  }

  await ensureDailyQuotaCapacity(searchTierLimits.paid.unitsPerDay);

  const now = new Date(); // 记录当前时间用于生成周期信息。
  const periodEnd = plan.billing_interval === "monthly" ? addMonths(now, 1) : addYears(now, 1); // 根据计费周期计算周期结束时间。

  const previousSubscription = await prisma.userSubscription.findFirst({ // 查询用户当前有效订阅以便更新状态。
    where: { user_id: userId, status: { in: ["active", "trialing", "past_due"] as SubscriptionStatus[] } }, // 筛选仍在有效期或待续费的订阅。
    orderBy: { created_at: "desc" } // 按创建时间倒序，获取最近一条。
  }); // 执行查询得到旧订阅或 null。

  const result = await prisma.$transaction(async (tx) => { // 使用事务确保用户、订阅、发票更新一致。
    if (previousSubscription) { // 如果存在旧订阅。
      await tx.userSubscription.update({ // 更新旧订阅状态。
        where: { id: previousSubscription.id }, // 依据订阅 ID 定位记录。
        data: { status: "canceled", canceled_at: now } // 将状态改为 canceled 并记录取消时间。
      }); // 执行更新操作。
    }

    const subscription = await tx.userSubscription.create({ // 创建新的订阅记录并返回关联套餐。
      data: { // 指定字段内容。
        user_id: userId, // 关联用户。
        plan_id: plan.id, // 关联套餐。
        status: "active", // 将订阅状态设置为 active（模拟支付后立即生效）。
        started_at: now, // 记录开始时间。
        current_period_start: now, // 设置当前周期开始时间。
        current_period_end: periodEnd, // 设置当前周期结束时间。
        trial_ends_at: null // 试用阶段已结束，设为 null。
      },
      include: { plan: true } // 在返回值中附带 plan 信息，方便后续读取 limits。
    }); // 完成订阅创建。

    const invoice = await tx.invoice.create({ // 创建发票记录模拟支付完成。
      data: { // 指定发票字段。
        subscription_id: subscription.id, // 关联订阅。
        user_id: userId, // 关联用户。
        plan_id: plan.id, // 关联套餐。
        amount_cents: plan.price_cents, // 金额使用套餐价格。
        currency: plan.currency, // 记录货币类型。
        status: plan.price_cents === 0 ? "paid" : "paid", // 这里模拟支付成功，直接标记为已支付。
        description: note ?? `订阅 ${plan.name}`, // 生成描述文本。
        paid_at: now // 记录支付时间。
      }
    }); // 完成发票创建。

    await tx.$executeRaw`UPDATE users
      SET status = 'active',
          plan_id = ${plan.id}::uuid,
          plan_expire_at = ${periodEnd},
          trial_reminder_sent_at = NULL,
          updated_at = NOW()
      WHERE id = ${userId}::uuid`; // 直接使用 SQL 更新，避免 Prisma 输入限制。

    const updatedUser = await tx.user.findUnique({
      where: { id: userId },
      include: { plan: true, profile: true }
    });
    if (!updatedUser) {
      throw new Error('用户不存在');
    }

    return { subscription, invoice, user: updatedUser }; // 返回事务结果（不包含 plan，外层可使用闭包变量）。
  }); // 完成事务。

  return { ...result, limits: planLimits }; // 返回创建结果并携带配额信息。
}

/**
 * 获取指定用户发票列表，按时间倒序排列。
 */
export async function listInvoices(userId: string): Promise<Invoice[]> { // 暴露函数用于查询发票列表。
  const invoices = await prisma.invoice.findMany({ // 查询 invoices 表。
    where: { user_id: userId }, // 根据用户 ID 筛选发票。
    orderBy: { issued_at: "desc" } // 按发票开票时间倒序排列。
  }); // 执行查询得到结果数组。
  return invoices; // 返回查询到的发票列表。
}
