const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

type MailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export function buildVerificationEmail(token: string): MailTemplate {
  const baseUrl = APP_URL.replace(/\/$/, "");
  const link = `${baseUrl}/email/verify?token=${encodeURIComponent(token)}`;
  return {
    subject: "Product Insight - 请验证您的邮箱",
    html: `
      <div style="font-family:Inter,Segoe UI,sans-serif;font-size:15px;color:#1f2937;line-height:1.6;">
        <h2 style="margin-bottom:12px;">欢迎使用 Product Insight</h2>
        <p>感谢注册！点击下方按钮完成邮箱验证，以便开始使用 1 天免费试用：</p>
        <p style="margin:24px 0;">
          <a href="${link}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">验证邮箱</a>
        </p>
        <p>若按钮无法点击，请复制以下链接到浏览器打开：</p>
        <p style="word-break:break-all;color:#2563eb;">${link}</p>
        <p style="margin-top:32px;color:#6b7280;font-size:13px;">该链接 24 小时内有效。如非本人操作，可忽略此邮件。</p>
      </div>
    `,
    text: [
      "欢迎使用 Product Insight",
      "感谢注册！请访问以下链接完成邮箱验证（24 小时内有效）：",
      link,
      "",
      "如果不是您本人操作，可忽略此邮件。"
    ].join("\n")
  };
}

export function buildResetPasswordEmail(token: string): MailTemplate {
  const baseUrl = APP_URL.replace(/\/$/, "");
  const link = `${baseUrl}/password/reset?token=${encodeURIComponent(token)}`;
  return {
    subject: "Product Insight - 重置密码",
    html: `
      <div style="font-family:Inter,Segoe UI,sans-serif;font-size:15px;color:#1f2937;line-height:1.6;">
        <h2 style="margin-bottom:12px;">重置密码请求</h2>
        <p>如果这是您发起的请求，请点击下方按钮重置密码：</p>
        <p style="margin:24px 0;">
          <a href="${link}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">重置密码</a>
        </p>
        <p>若按钮无法点击，请复制以下链接到浏览器打开：</p>
        <p style="word-break:break-all;color:#2563eb;">${link}</p>
        <p style="margin-top:32px;color:#6b7280;font-size:13px;">如果您未进行该操作，可以忽略此邮件。</p>
      </div>
    `,
    text: [
      "您发起了重置密码请求。",
      "请访问以下链接完成密码重置（24 小时内有效）：",
      link,
      "",
      "如果不是您本人操作，可以忽略此邮件。"
    ].join("\n")
  };
}
