// 该文件实现定时扫描试用/订阅到期并发送提醒邮件的任务逻辑。

import { addHours } from "date-fns"; // 引入日期工具用于计算提醒时间窗口。
import { billingReminderConfig } from "../config/billing.js"; // 引入提醒任务相关配置。
import { prisma } from "../db/prisma.js"; // 引入 Prisma 客户端执行数据库查询和更新。
import { buildSubscriptionRenewalReminderEmail, buildTrialExpiringEmail } from "../services/mail/templates.js"; // 引入提醒邮件模板构建函数。
import { parsePlanLimits, planAllowsNotification } from "../services/billing/limits.js"; // 引入套餐配额解析与校验工具。
import { sendMail } from "../services/mail/sender.js"; // 引入邮件发送函数。

/**
 * 执行订阅提醒任务，返回发送统计。
 */
export async function runBillingReminderJob(): Promise<{ trialNotified: number; renewalNotified: number }> { // 暴露异步函数供调度器调用。
  const now = new Date(); // 记录任务执行开始时间。

  const trialDeadline = addHours(now, billingReminderConfig.trialLookaheadHours); // 计算试用提醒的时间上限。
  const renewalDeadline = addHours(now, billingReminderConfig.renewalLookaheadHours); // 计算订阅续费提醒的时间上限。

  const trialUsers = await prisma.user.findMany({ // 查询符合条件的试用用户。
    where: { // 构建筛选条件。
      status: "trialing", // 当前状态为试用期。
      trial_ends_at: { gt: now, lte: trialDeadline }, // 试用结束时间在提醒窗口内。
      trial_reminder_sent_at: null, // 还未发送过提醒。
      email_verified_at: { not: null } // 已验证邮箱，以确保可以发送提醒。
    },
    take: billingReminderConfig.batchSize // 限制单次处理数量，避免一次拉取过多记录。
  }); // 返回等待提醒的试用用户列表。

  let trialNotified = 0; // 初始化试用提醒计数。

  for (const user of trialUsers) { // 遍历试用用户列表。
    const email = buildTrialExpiringEmail({ email: user.email, expiresAt: user.trial_ends_at }); // 构建试用到期提醒邮件内容。
    await sendMail({ subject: email.subject, html: email.html, text: email.text }, [user.email]); // 发送提醒邮件到用户邮箱。
    await prisma.user.update({ where: { id: user.id }, data: { trial_reminder_sent_at: now } }); // 更新用户记录，标记提醒已发送。
    trialNotified += 1; // 递增提醒计数。
  }

  const subscriptions = await prisma.userSubscription.findMany({ // 查询需要续费提醒的订阅记录。
    where: { // 构建筛选条件。
      status: "active", // 订阅处于激活状态。
      cancel_at_period_end: false, // 未设置周期结束后自动取消。
      current_period_end: { gt: now, lte: renewalDeadline }, // 当前周期结束时间在提醒窗口内。
      renewal_reminder_sent_at: null // 尚未发送续费提醒。
    },
    include: { user: true, plan: true }, // 同时加载关联的用户与套餐信息便于邮件内容使用。
    take: billingReminderConfig.batchSize // 限制单次处理数量。
  }); // 获取待提醒的订阅列表。

  let renewalNotified = 0; // 初始化续费提醒计数。

  for (const subscription of subscriptions) { // 遍历待提醒的订阅。
    if (!subscription.user?.email || !subscription.plan) { // 如果缺少用户或套餐信息。
      continue; // 跳过此订阅，避免发送空邮件。
    }
    const planLimits = parsePlanLimits(subscription.plan); // 解析套餐配额信息。
    if (!planAllowsNotification(planLimits, 'email')) { // 若套餐未允许 email 通知。
      continue; // 跳过本次提醒，避免违反配额限制。
    }
    const email = buildSubscriptionRenewalReminderEmail({ // 构建续费提醒邮件内容。
      email: subscription.user.email, // 收件人邮箱。
      planName: subscription.plan.name, // 套餐名称。
      periodEnd: subscription.current_period_end // 当前周期结束时间。
    }); // 获取邮件模板。
    await sendMail({ subject: email.subject, html: email.html, text: email.text }, [subscription.user.email]); // 发送续费提醒邮件。
    await prisma.userSubscription.update({ where: { id: subscription.id }, data: { renewal_reminder_sent_at: now } }); // 更新订阅记录，标记提醒已发送。
    renewalNotified += 1; // 递增续费提醒计数。
  }

  return { trialNotified, renewalNotified }; // 返回提醒统计结果供日志使用。
}
