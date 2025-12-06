// 该文件定义订阅管理相关的 HTTP 路由，包括套餐查询与订阅创建等接口。

import { Router } from "express"; // 引入 Express Router 用于定义路由。
import { z } from "zod"; // 引入 zod 进行请求参数校验。
import { listActivePlans } from "../services/billing/plan-service.js"; // 引入套餐列表服务函数。
import { createSubscription, getLatestSubscription, listInvoices } from "../services/billing/subscription-service.js"; // 引入订阅服务函数。
import { createHttpError } from "../utils/http-error.js"; // 引入错误辅助函数以便抛出自定义错误。
import { prisma } from "../db/prisma.js"; // 引入 Prisma 客户端，用于加载用户和套餐信息。
import { parsePlanLimits } from "../services/billing/limits.js"; // 引入套餐配额解析工具。

const router = Router(); // 创建路由实例以挂载后续路由。

const subscriptionCreateSchema = z.object({ // 定义创建订阅请求的参数结构。
  userId: z.string().min(1), // 要求提供用户 ID，且非空。
  planCode: z.string().min(1), // 要求提供套餐编码，且非空。
  note: z.string().max(200).optional() // 可选备注字段，用于记录来源。
}); // 完成 schema 定义。

router.get("/plans", async (_req, res, next) => { // 定义获取套餐列表的 GET 路由。
  try { // 尝试执行业务逻辑。
    const plans = await listActivePlans(); // 调用服务层获取激活套餐。
    res.json({ plans }); // 返回 JSON 响应包含套餐数组。
  } catch (error) { // 捕获异常。
    next(error); // 交给全局错误处理中间件。
  }
}); // 结束路由定义。

router.get("/subscription", async (req, res, next) => { // 定义获取用户订阅详情的 GET 路由。
  try { // 包裹 try/catch 处理异常。
    const userId = typeof req.query.userId === "string" ? req.query.userId : null; // 从查询参数读取用户 ID。
    if (!userId) { // 若未提供 userId。
      throw createHttpError(400, "缺少 userId 参数"); // 抛出 400 错误提示。
    }
    const userRecord = await prisma.user.findUnique({ where: { id: userId }, include: { plan: true } }); // 根据用户 ID 查询用户并加载当前套餐。
    if (!userRecord) { // 若用户不存在。
      throw createHttpError(404, "用户不存在"); // 抛出 404 错误告知客户端。
    }

    const subscription = await getLatestSubscription(userId); // 查询用户最近的订阅记录（包含 plan 信息）。
    const invoices = await listInvoices(userId); // 查询用户发票列表。
    const plan = subscription?.plan ?? userRecord.plan ?? null; // 确定当前套餐，优先使用订阅关联的套餐。
    const limits = plan ? parsePlanLimits(plan) : null; // 若存在套餐，则解析配额信息。

    res.json({ // 返回综合数据给前端。
      subscription, // 订阅详情。
      invoices, // 发票列表。
      plan, // 当前套餐信息。
      limits, // 套餐配额。
      user: {
        status: userRecord.status,
        trialStartedAt: userRecord.trial_started_at ?? null,
        trialEndsAt: userRecord.trial_ends_at,
        planExpireAt: userRecord.plan_expire_at
      } // 用户状态摘要。
    }); // 结束响应。
  } catch (error) { // 捕获异常。
    next(error); // 将错误交给全局处理。
  }
}); // 完成路由。

router.post("/subscription", async (req, res, next) => { // 定义创建订阅的 POST 路由。
  try { // 使用 try/catch 捕获错误。
    const payload = subscriptionCreateSchema.parse(req.body); // 使用 zod 校验并解析请求体。
    const result = await createSubscription(payload); // 调用服务层创建订阅。
    res.status(201).json(result); // 返回 201 状态和创建结果。
  } catch (error) { // 捕获异常。
    next(error); // 将异常传递给错误处理中间件。
  }
}); // 结束路由定义。

export default router; // 导出路由供 app.ts 挂载。
