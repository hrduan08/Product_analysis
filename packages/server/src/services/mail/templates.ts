// 该文件集中构建订阅相关邮件模板，包括试用提醒与订阅成功通知。

// 应用前端地址，用于生成邮件中的跳转链接；默认指向生产域名，避免遗漏环境变量时发出本地地址。
const APP_ORIGIN = (process.env.APP_URL ?? "https://voiceinsight.cloud").replace(/\/+$/, "");

/**
 * 构建试用到期提醒邮件内容。
 */
export function buildTrialExpiringEmail(params: { email: string; expiresAt: Date }): { subject: string; html: string; text: string } { // 返回对象包含邮件主题、HTML 与文本内容。
  const formattedDate = params.expiresAt.toLocaleString("zh-CN", { hour12: false }); // 将到期时间格式化为本地字符串。
  const upgradeUrl = `${APP_ORIGIN.replace(/\/$/, "")}/app/subscription`; // 构建升级引导链接。
  const subject = "Product Insight - 试用即将到期提醒"; // 邮件主题文案。
  const html = `
    <div style="font-family:Inter,Segoe UI,sans-serif;font-size:15px;color:#1f2937;line-height:1.6;">
      <h2 style="margin-bottom:12px;">试用即将到期</h2>
      <p>您好，${params.email}，感谢体验 Product Insight。</p>
      <p>您的免费试用将于 <strong>${formattedDate}</strong> 到期，届时将无法继续使用完整功能。</p>
      <p>升级专业版即可解锁多平台监控、实时通知、团队协作等高级能力。</p>
      <p style="margin:24px 0;">
        <a href="${upgradeUrl}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">立即升级套餐</a>
      </p>
      <p style="margin-top:32px;color:#6b7280;font-size:13px;">如已完成升级，可忽略本邮件。</p>
    </div>
  `; // HTML 内容。
  const text = [
    "试用即将到期",
    `您好，${params.email}，感谢体验 Product Insight。`,
    `您的免费试用将于 ${formattedDate} 到期，届时将无法继续使用完整功能。`,
    `升级套餐链接：${upgradeUrl}`,
    "如已完成升级，可忽略本邮件。"
  ].join("\n"); // 文本内容。
  return { subject, html, text }; // 返回构建好的模板。
}

/**
 * 构建订阅续费提醒邮件。
 */
export function buildSubscriptionRenewalReminderEmail(params: { email: string; planName: string; periodEnd: Date }): { subject: string; html: string; text: string } { // 返回续费提醒邮件内容。
  const formattedDate = params.periodEnd.toLocaleString("zh-CN", { hour12: false }); // 格式化当前周期结束时间。
  const billingUrl = `${APP_ORIGIN.replace(/\/$/, "")}/app/subscription`; // 构建账单中心链接。
  const subject = "Product Insight - 订阅即将续费"; // 邮件主题。
  const html = `
    <div style="font-family:Inter,Segoe UI,sans-serif;font-size:15px;color:#1f2937;line-height:1.6;">
      <h2 style="margin-bottom:12px;">订阅续费提醒</h2>
      <p>您好，${params.email}，您当前的 ${params.planName} 套餐将于 <strong>${formattedDate}</strong> 续费。</p>
      <p>如需调整套餐或取消续费，请在续费前前往账单管理页面操作。</p>
      <p style="margin:24px 0;">
        <a href="${billingUrl}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">管理订阅</a>
      </p>
      <p style="margin-top:32px;color:#6b7280;font-size:13px;">若已完成变更或不再需要本提醒，可忽略此邮件。</p>
    </div>
  `; // HTML 内容。
  const text = [
    "订阅续费提醒",
    `您好，${params.email}，您当前的 ${params.planName} 套餐将于 ${formattedDate} 续费。`,
    `如需调整套餐或取消续费，请在续费前访问 ${billingUrl}。`,
    "若已完成变更或不再需要本提醒，可忽略此邮件。"
  ].join("\n"); // 文本内容。
  return { subject, html, text }; // 返回构建好的模板。
}
