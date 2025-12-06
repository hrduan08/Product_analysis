import { buildFeishuTextPayload, sendFeishuWebhookMessage } from './feishu.js';

function resolveOperationsConfig() {
  const webhook =
    process.env.FEISHU_OPERATION_WEBHOOK ?? process.env.FEISHU_FEEDBACK_WEBHOOK ?? '';
  const secret =
    process.env.FEISHU_OPERATION_SECRET ?? process.env.FEISHU_FEEDBACK_SECRET ?? '';
  return { webhook, secret };
}

export async function notifyOperations(message: string): Promise<void> {
  const { webhook, secret } = resolveOperationsConfig();
  if (!webhook) {
    return;
  }
  await sendFeishuWebhookMessage({
    webhook,
    secret: secret || undefined,
    payload: buildFeishuTextPayload(message)
  });
}
