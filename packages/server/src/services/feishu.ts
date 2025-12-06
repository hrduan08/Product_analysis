import crypto from 'node:crypto';

import { feedbackConfig } from '../config/feedback.js';
import { fetch } from 'undici';

type FeishuTextPayload = { text: string };

export type FeishuWebhookPayload = {
  msg_type: string;
  [key: string]: unknown;
};

export function buildFeishuTextPayload(text: string): FeishuWebhookPayload {
  return {
    msg_type: 'text',
    content: {
      text
    }
  };
}

export async function sendFeishuMessage(body: FeishuTextPayload): Promise<void> {
  if (!feedbackConfig.feishuWebhook) {
    throw new Error('FEISHU_FEEDBACK_WEBHOOK 未配置，无法发送反馈');
  }
  await postFeishuMessage({
    webhook: feedbackConfig.feishuWebhook,
    secret: feedbackConfig.feishuSecret,
    payload: buildFeishuTextPayload(body.text)
  });
}

export async function sendFeishuWebhookMessage(options: {
  webhook: string;
  payload: FeishuWebhookPayload;
  secret?: string;
}): Promise<void> {
  await postFeishuMessage({ webhook: options.webhook, secret: options.secret, payload: options.payload });
}

async function postFeishuMessage(options: {
  webhook: string;
  secret?: string;
  payload: FeishuWebhookPayload;
}): Promise<void> {
  const payload: Record<string, unknown> = { ...options.payload };

  if (options.secret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = crypto
      .createHmac('sha256', options.secret)
      .update(`${timestamp}\n${options.secret}`)
      .digest('base64');
    Object.assign(payload, { timestamp, sign });
  }

  const response = await fetch(options.webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`飞书机器人请求失败：${raw}`);
  }
  try {
    const data = JSON.parse(raw) as { StatusCode?: number; StatusMessage?: string };
    if (typeof data.StatusCode === 'number' && data.StatusCode !== 0) {
      throw new Error(`飞书机器人返回异常：${data.StatusCode} ${data.StatusMessage ?? ''}`.trim());
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`解析飞书返回值失败：${raw}`);
    }
    throw error;
  }
}
