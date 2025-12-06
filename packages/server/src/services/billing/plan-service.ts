// 该文件负责处理订阅套餐（Plan）的读取逻辑，用于向路由层提供已激活套餐的列表数据。

import type { Plan } from "../../generated/prisma/client.js"; // 引入 Plan 类型用于显式返回类型声明。
import { prisma } from "../../db/prisma.js"; // 引入 Prisma 客户端实例以便执行数据库查询。

const ALLOWED_PLAN_CODES = ["MONTHLY_BASIC", "YEARLY_BASIC"] as const;

/**
 * 获取所有处于激活状态的订阅套餐，按价格升序返回。
 */
export async function listActivePlans(): Promise<Plan[]> { // 暴露异步函数，返回激活套餐列表。
  const plans = await prisma.plan.findMany({ // 查询数据库中的套餐数据。
    where: { is_active: true, code: { in: ALLOWED_PLAN_CODES as unknown as string[] } }, // 仅筛选 is_active 为 true 的套餐，并限制在允许的 code 列表中。
    orderBy: { price_cents: "asc" } // 根据 price_cents 升序排序以便前端展示。
  }); // 执行查询并得到结果数组。
  return plans; // 返回查询到的套餐列表。
}
