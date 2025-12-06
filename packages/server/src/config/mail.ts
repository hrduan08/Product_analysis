export type MailProvider = "sendgrid" | "mailgun" | "ses" | "smtp" | "stub";

type CommonMailConfig = {
  provider: MailProvider;
  from: string;
  replyTo?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subjectTemplate: string;
  sendWhenEmpty: boolean;
};

export type SendGridConfig = CommonMailConfig & {
  provider: "sendgrid";
  apiKey: string;
};

export type SmtpConfig = CommonMailConfig & {
  provider: "smtp";
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
};

export type MailConfig = SendGridConfig | SmtpConfig | (CommonMailConfig & { provider: Exclude<MailProvider, "sendgrid" | "smtp"> });

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const provider = (process.env.MAIL_PROVIDER ?? "sendgrid").toLowerCase() as MailProvider;

const baseConfig: CommonMailConfig = {
  provider,
  from: process.env.MAIL_FROM ?? '"Product Bot" <noreply@example.com>',
  replyTo: process.env.MAIL_REPLY_TO,
  to: parseList(process.env.MAIL_TO),
  cc: parseList(process.env.MAIL_CC),
  bcc: parseList(process.env.MAIL_BCC),
  subjectTemplate: process.env.MAIL_SUBJECT_TEMPLATE ?? "[Product Insight] {{date}} 新增 {{count}} 条",
  sendWhenEmpty: parseBoolean(process.env.MAIL_SEND_EMPTY, false)
};

let resolvedConfig: MailConfig;

if (provider === "sendgrid") {
  if (!process.env.MAIL_API_KEY) {
    throw new Error("[mail] SENDGRID 需要设置 MAIL_API_KEY");
  }
  resolvedConfig = {
    ...baseConfig,
    provider: "sendgrid",
    apiKey: process.env.MAIL_API_KEY
  };
} else if (provider === "smtp") {
  resolvedConfig = {
    ...baseConfig,
    provider: "smtp",
    host: process.env.MAIL_SMTP_HOST ?? "localhost",
    port: parseNumber(process.env.MAIL_SMTP_PORT, 465),
    username: process.env.MAIL_SMTP_USER ?? "",
    password: process.env.MAIL_SMTP_PASS ?? "",
    secure: parseBoolean(process.env.MAIL_SMTP_SECURE, true)
  };
} else {
  resolvedConfig = baseConfig as MailConfig;
}

if (baseConfig.to.length === 0 && provider !== "stub") {
  console.warn("[mail] MAIL_TO 为空，发送时可能会因为缺少收件人而失败");
}

export const mailConfig = resolvedConfig;
