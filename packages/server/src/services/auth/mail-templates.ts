// 应用地址，用于认证相关邮件的跳转；默认使用生产域名，避免遗漏环境变量时发本地链接。
const APP_URL = (process.env.APP_URL ?? "https://voiceinsight.cloud").replace(/\/+$/, "");

type MailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type Lang = "zh" | "en";

export function buildVerificationEmail(token: string, lang: Lang = "zh"): MailTemplate {
  const baseUrl = APP_URL.replace(/\/$/, "");
  const link = `${baseUrl}/email/verify?token=${encodeURIComponent(token)}`;
  if (lang === "en") {
    return {
      subject: "Voice Insight - Please verify your email",
      html: `
        <p>Welcome to Voice Insight.</p>
        <p>Please click the link below to verify your email (valid for 24 hours):</p>
        <p><a href="${link}">${link}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
        <p>If you have any questions, contact us at <a href="mailto:contact@voiceinsight.cloud">contact@voiceinsight.cloud</a>.</p>
        <p>— Voice Insight · <a href="https://voiceinsight.cloud">https://voiceinsight.cloud</a></p>
      `,
      text: [
        "Welcome to Voice Insight.",
        "Please visit the link below to verify your email (valid for 24 hours):",
        link,
        "",
        "If you did not request this, you can ignore this email.",
        "If you have any questions, contact us at contact@voiceinsight.cloud.",
        "— Voice Insight · https://voiceinsight.cloud"
      ].join("\n")
    };
  }
  return {
    subject: "Voice Insight - 请验证您的邮箱",
    // 极简 HTML，避免花哨样式/按钮，降低被过滤概率。
    html: `
      <p>欢迎使用 Voice Insight。</p>
      <p>请点击下方链接完成邮箱验证（24 小时内有效）：</p>
      <p><a href="${link}">${link}</a></p>
      <p>如果不是您本人操作，可忽略此邮件。</p>
      <p>如有疑问，可邮件联系 <a href="mailto:contact@voiceinsight.cloud">contact@voiceinsight.cloud</a>。</p>
      <p>— Voice Insight · <a href="https://voiceinsight.cloud">https://voiceinsight.cloud</a></p>
    `,
    text: [
      "欢迎使用 Voice Insight",
      "感谢注册！请访问以下链接完成邮箱验证（24 小时内有效）：",
      link,
      "",
      "如果不是您本人操作，可忽略此邮件。",
      "如有疑问，可邮件联系 contact@voiceinsight.cloud。",
      "— Voice Insight · https://voiceinsight.cloud"
    ].join("\n")
  };
}

export function buildResetPasswordEmail(token: string, lang: Lang = "zh"): MailTemplate {
  const baseUrl = APP_URL.replace(/\/$/, "");
  const link = `${baseUrl}/password/reset?token=${encodeURIComponent(token)}`;
  if (lang === "en") {
    return {
      subject: "Voice Insight - Reset your password",
      html: `
        <p>You requested a password reset.</p>
        <p>Please click the link below to reset your password (valid for 24 hours):</p>
        <p><a href="${link}">${link}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
        <p>If you have any questions, contact us at <a href="mailto:contact@voiceinsight.cloud">contact@voiceinsight.cloud</a>.</p>
        <p>— Voice Insight · <a href="https://voiceinsight.cloud">https://voiceinsight.cloud</a></p>
      `,
      text: [
        "You requested a password reset.",
        "Please use the link below to reset your password (valid for 24 hours):",
        link,
        "",
        "If you did not request this, you can ignore this email.",
        "If you have any questions, contact us at contact@voiceinsight.cloud.",
        "— Voice Insight · https://voiceinsight.cloud"
      ].join("\n")
    };
  }
  return {
    subject: "Voice Insight - 重置密码",
    html: `
      <p>您发起了重置密码请求。</p>
      <p>请点击下方链接完成密码重置（24 小时内有效）：</p>
      <p><a href="${link}">${link}</a></p>
      <p>如果不是您本人操作，可以忽略此邮件。</p>
      <p>如有疑问，可邮件联系 <a href="mailto:contact@voiceinsight.cloud">contact@voiceinsight.cloud</a>。</p>
      <p>— Voice Insight · <a href="https://voiceinsight.cloud">https://voiceinsight.cloud</a></p>
    `,
    text: [
      "您发起了重置密码请求。",
      "请访问以下链接完成密码重置（24 小时内有效）：",
      link,
      "",
      "如果不是您本人操作，可以忽略此邮件。",
      "如有疑问，可邮件联系 contact@voiceinsight.cloud。",
      "— Voice Insight · https://voiceinsight.cloud"
    ].join("\n")
  };
}
