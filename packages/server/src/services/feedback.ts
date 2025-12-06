import { z } from 'zod';

import { sendFeishuMessage } from './feishu.js';

const attachmentSchema = z
  .array(
    z.object({
      name: z.string().min(1).max(120),
      url: z.string().url(),
      type: z.string().max(60),
      size: z.number().positive().max(5 * 1024 * 1024)
    })
  )
  .max(5)
  .optional();

const feedbackSchema = z.object({
  userId: z.string().uuid().optional(),
  anonymousId: z.string().max(120).optional(),
  category: z.enum(['bug', 'idea', 'other']).default('bug'),
  title: z.string().max(120).optional().transform((value) => value?.trim() ?? ''),
  description: z.string().min(10).max(3000),
  contactEmail: z.string().email().optional(),
  attachments: attachmentSchema,
  diagnostics: z.any().optional()
});

export type FeedbackInput = z.input<typeof feedbackSchema>;

export async function sendFeedbackToFeishu(input: FeedbackInput): Promise<void> {
  const payload = feedbackSchema.parse(input);
  const lines: string[] = [];
  lines.push(`【${getCategoryLabel(payload.category)}】用户：${formatUser(payload)}`);
  if (payload.title) {
    lines.push(`标题：${payload.title}`);
  }
  lines.push(`描述：${payload.description}`);
  lines.push(`联系邮箱：${payload.contactEmail ?? '（未提供）'}`);
  if (payload.attachments?.length) {
    lines.push('附件：');
    payload.attachments.forEach((file, index) => {
      lines.push(`${index + 1}. ${file.name} (${formatBytes(file.size)}) ${file.url}`);
    });
  } else {
    lines.push('附件：无');
  }
  if (payload.diagnostics) {
    const json = JSON.stringify(payload.diagnostics, null, 2);
    const snippet = json.length > 1800 ? `${json.slice(0, 1800)}…` : json;
    lines.push('诊断信息：');
    lines.push(snippet);
  }

  await sendFeishuMessage({ text: lines.join('\n') });
}

function getCategoryLabel(category: FeedbackInput['category']): string {
  switch (category) {
    case 'bug':
      return '遇到问题';
    case 'idea':
      return '功能建议';
    default:
      return '其他反馈';
  }
}

function formatUser(payload: FeedbackInput & { userId?: string; anonymousId?: string }): string {
  if (payload.userId) {
    return `用户ID ${payload.userId}`;
  }
  if (payload.anonymousId) {
    return `匿名 ${payload.anonymousId}`;
  }
  return '匿名用户';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)}${sizes[i]}`;
}
