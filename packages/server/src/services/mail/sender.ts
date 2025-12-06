import nodemailer from "nodemailer";
import { fetch } from "undici";

import { mailConfig, type SendGridConfig, type SmtpConfig } from "../../config/mail.js";
import type { MailPayload } from "./composer.js";

type MailSendResult = {
  messageId?: string;
  acceptedRecipients: number;
};

let smtpTransporter: nodemailer.Transporter | null = null;

export async function sendMail(payload: MailPayload, recipients?: string[]): Promise<MailSendResult> {
  const to = recipients && recipients.length > 0 ? recipients : mailConfig.to;
  if (mailConfig.provider !== "stub" && to.length === 0) {
    throw new Error("[mail] MAIL_TO 为空，无法发送邮件");
  }

  switch (mailConfig.provider) {
    case "sendgrid":
      return sendViaSendGrid({ ...mailConfig }, payload, to);
    case "smtp":
      return sendViaSmtp({ ...mailConfig }, payload, to);
    case "stub":
      return sendViaStub(payload, to);
    default:
      throw new Error(`[mail] 暂未实现 provider=${mailConfig.provider} 的发送逻辑`);
  }
}

async function sendViaSendGrid(config: SendGridConfig, payload: MailPayload, to: string[]): Promise<MailSendResult> {
  const body = {
    personalizations: [
      {
        to: mapAddresses(to),
        ...(config.cc.length > 0 ? { cc: mapAddresses(config.cc) } : {}),
        ...(config.bcc.length > 0 ? { bcc: mapAddresses(config.bcc) } : {})
      }
    ],
    from: mapAddress(config.from),
    ...(config.replyTo ? { reply_to: mapAddress(config.replyTo) } : {}),
    subject: payload.subject,
    content: [
      { type: "text/plain", value: payload.text },
      { type: "text/html", value: payload.html }
    ]
  };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[mail] SendGrid 请求失败：${response.status} ${response.statusText} - ${errorBody}`);
  }

  const messageId = response.headers.get("x-message-id") ?? undefined;

  return {
    messageId,
    acceptedRecipients: to.length + config.cc.length + config.bcc.length
  };
}

async function sendViaSmtp(config: SmtpConfig, payload: MailPayload, to: string[]): Promise<MailSendResult> {
  const transporter = getSmtpTransporter(config);

  const info = await transporter.sendMail({
    from: config.from,
    to: to.join(","),
    cc: config.cc.length ? config.cc.join(",") : undefined,
    bcc: config.bcc.length ? config.bcc.join(",") : undefined,
    replyTo: config.replyTo,
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  });

  return {
    messageId: info.messageId,
    acceptedRecipients: Array.isArray(info.accepted) ? info.accepted.length : to.length
  };
}

function getSmtpTransporter(config: SmtpConfig): nodemailer.Transporter {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  smtpTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password
    }
  });

  return smtpTransporter;
}

async function sendViaStub(_payload: MailPayload, to: string[]): Promise<MailSendResult> {
  console.log("[mail] stub send", { recipients: to });
  return {
    messageId: undefined,
    acceptedRecipients: to.length
  };
}

type Address = { email: string; name?: string };

function mapAddresses(list: string[]): Address[] {
  return list.map(mapAddress);
}

function mapAddress(value: string): Address {
  const match = value.match(/(.*)<(.+)>/);
  if (match) {
    return {
      name: match[1].trim().replace(/(^"|"$)/g, ""),
      email: match[2].trim()
    };
  }
  return { email: value.trim() };
}
