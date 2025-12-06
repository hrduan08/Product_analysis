// 该文件解析与订阅提醒相关的环境变量，提供 Cron 或提醒逻辑所需的配置。

function toBoolean(value: string | undefined, fallback: boolean): boolean { // 将字符串转换为布尔值。
  if (value === undefined) { // 若环境变量未定义。
    return fallback; // 返回默认值。
  }
  return value === 'true'; // 将字符串 true 视为真。
}

function toNumber(value: string | undefined, fallback: number): number { // 将字符串转换为数字。
  if (!value) { // 当值为空时。
    return fallback; // 返回默认值。
  }
  const parsed = Number(value); // 尝试解析为数字。
  return Number.isFinite(parsed) ? parsed : fallback; // 如果解析失败则返回默认值。
}

export const billingReminderConfig = { // 导出提醒配置对象。
  enabled: toBoolean(process.env.BILLING_REMINDER_ENABLED, true), // 是否启用提醒任务，默认开启。
  schedule: process.env.BILLING_REMINDER_CRON ?? '0 10 * * *', // Cron 表达式，默认每天 10:00。
  timezone: process.env.BILLING_REMINDER_TZ ?? 'Asia/Shanghai', // 任务运行时区。
  trialLookaheadHours: toNumber(process.env.BILLING_TRIAL_REMINDER_HOURS, 24), // 距离试用到期多久发送提醒，默认 24 小时。
  renewalLookaheadHours: toNumber(process.env.BILLING_RENEWAL_REMINDER_HOURS, 24), // 订阅续费提醒提前小时数。
  batchSize: toNumber(process.env.BILLING_REMINDER_BATCH_SIZE, 200), // 每次处理的用户/订阅数量。
  runOnStartup: toBoolean(process.env.BILLING_REMINDER_RUN_ON_STARTUP, false) // 是否在服务启动时立即执行一次提醒任务。
}; // 配置对象定义结束。
