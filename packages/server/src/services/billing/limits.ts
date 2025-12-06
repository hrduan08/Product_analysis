// 该文件提供解析套餐配额（limits）并执行配额校验的辅助函数。

import type { Plan } from "../../generated/prisma/client.js"; // 引入 Plan 类型以确保类型安全。

// 定义套餐配额的结构，描述常用限制参数。
export type PlanLimits = { // PlanLimits 类型表示解析后的配额对象。
  keywords?: number | "unlimited"; // 关键词上限，可为数值或 unlimited。
  members?: number | "unlimited"; // 团队成员上限。
  notifications: string[]; // 允许的通知渠道列表。
  exports?: boolean; // 是否允许数据导出。
};

// 安全解析 JSON 配额；若结构缺失则提供默认值。
export function parsePlanLimits(plan: Pick<Plan, "limits">): PlanLimits { // 接收带 limits 字段的 Plan。
  const raw = plan.limits; // 读取原始 JSON 数据。
  if (!raw || typeof raw !== "object") { // 若 limits 未设置或不是对象。
    return { notifications: ["email"] }; // 默认允许 email 通知并返回空限制。
  }

  const parsed = raw as Record<string, unknown>; // 将 JSON 视为普通对象以便读取属性。
  const notifications = Array.isArray(parsed.notifications) // 判断 notifications 是否为数组。
    ? parsed.notifications.filter((item) => typeof item === "string") // 仅保留字符串元素。
    : ["email"]; // 如果未配置则默认允许 email。

  const keywords = typeof parsed.keywords === "number" || parsed.keywords === "unlimited" // 关键词字段验证。
    ? parsed.keywords // 若格式正确则使用原值。
    : undefined; // 否则视为未设置。

  const members = typeof parsed.members === "number" || parsed.members === "unlimited" // 成员字段验证。
    ? parsed.members // 使用原值。
    : undefined; // 未设置成员限制。

  const exportsEnabled = typeof parsed.exports === "boolean" ? parsed.exports : undefined; // 解析导出权限。

  return { keywords, members, notifications, exports: exportsEnabled }; // 返回统一的配额结构。
}

// 判断指定通知渠道是否被允许。
export function planAllowsNotification(limits: PlanLimits, channel: string): boolean { // 接收配额与渠道字符串。
  return limits.notifications.includes(channel); // 如果渠道存在于列表中则返回 true。
}
