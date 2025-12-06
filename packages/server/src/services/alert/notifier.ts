// 该文件封装运营告警能力，支持飞书 Webhook 通知、限频以及历史记录。

import { prisma } from '../../db/prisma.js';
import type { AlertSeverity, Prisma } from '../../generated/prisma/client.js';
import { buildFeishuTextPayload, sendFeishuWebhookMessage } from '../feishu.js';

const feishuAlertWebhook = process.env.FEISHU_ALERT_WEBHOOK ?? '';
const feishuAlertSecret = process.env.FEISHU_ALERT_SECRET ?? '';
const DEFAULT_THROTTLE_MINUTES = 15;

type SendAlertOptions = {
  emoji?: string;
};

type NotifyAlertOptions = {
  severity?: AlertSeverity;
  dedupeKey?: string;
  throttleMinutes?: number;
  tags?: string[];
  source?: string;
};

const severityEmoji: Record<AlertSeverity, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨'
};

export async function sendAlert(message: string, payload?: unknown, options?: SendAlertOptions): Promise<void> {
  const emoji = options?.emoji ?? '⚠️';
  const hasFeishu = Boolean(feishuAlertWebhook);

  if (!hasFeishu) {
    console.warn('[alert] 未配置飞书 webhook，跳过发送', { message, payload });
    return;
  }

  const text = buildFeishuAlertText(message, payload, emoji);
  try {
    await sendFeishuWebhookMessage({
      webhook: feishuAlertWebhook,
      secret: feishuAlertSecret || undefined,
      payload: buildFeishuTextPayload(text)
    });
  } catch (error) {
    console.error('[alert] 飞书通知失败', error);
  }
}

export async function notifyAlert(message: string, payload?: unknown, options?: NotifyAlertOptions): Promise<void> {
  const severity = options?.severity ?? 'warning';
  const dedupeKey = options?.dedupeKey ?? message;
  const throttleMinutes = options?.throttleMinutes ?? DEFAULT_THROTTLE_MINUTES;
  const now = new Date();
  const serializedPayload = serializePayload(payload);

  const existing = await prisma.alert.findUnique({ where: { dedupe_key: dedupeKey } });

  const updateTags = options?.tags;
  const updateSource = options?.source;

  let shouldNotify = true;

  if (existing && throttleMinutes > 0 && existing.last_notified_at) {
    const nextNotifyAt = existing.last_notified_at.getTime() + throttleMinutes * 60 * 1000;
    if (now.getTime() < nextNotifyAt) {
      shouldNotify = false;
    }
  }

  let record;
  if (existing) {
    const updateData: Prisma.AlertUpdateInput = {
      message,
      severity,
      last_triggered_at: now,
      occurrences: { increment: 1 }
    };
    if (serializedPayload !== undefined) {
      updateData.payload = serializedPayload;
    }
    if (updateTags) {
      updateData.tags = { set: updateTags };
    }
    if (typeof updateSource === 'string') {
      updateData.source = updateSource;
    }
    record = await prisma.alert.update({
      where: { id: existing.id },
      data: updateData
    });
  } else {
    const createData: Prisma.AlertCreateInput = {
      dedupe_key: dedupeKey,
      message,
      severity,
      tags: options?.tags ?? [],
      source: options?.source ?? null,
      occurrences: 1,
      last_triggered_at: now
    };
    if (serializedPayload !== undefined) {
      createData.payload = serializedPayload;
    }
    record = await prisma.alert.create({
      data: createData
    });
  }

  if (!shouldNotify) {
    console.log('[alert] 触发被限频', {
      dedupeKey,
      severity,
      message
    });
    return;
  }

  const alertPayload = {
    severity,
    dedupeKey,
    source: options?.source ?? record.source ?? null,
    tags: record.tags,
    occurrences: record.occurrences,
    triggeredAt: record.last_triggered_at,
    payload
  };

  await sendAlert(
    options?.source ? `[${options.source}] ${message}` : message,
    alertPayload,
    { emoji: severityEmoji[severity] }
  );

  await prisma.alert.update({
    where: { id: record.id },
    data: { last_notified_at: now }
  });
}

function serializePayload(payload: unknown): Prisma.JsonValue | undefined {
  if (payload === undefined) {
    return undefined;
  }
  if (payload === null) {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(payload)) as Prisma.JsonValue;
  } catch (error) {
    console.warn('[alert] payload 序列化失败，已转为字符串', error);
    return {
      __error: 'SERIALIZE_FAILED',
      message: payload instanceof Error ? payload.message : String(payload)
    } as Prisma.JsonValue;
  }
}

function buildFeishuAlertText(message: string, payload: unknown, emoji: string): string {
  const lines: string[] = [`${emoji} ${message}`];
  if (payload && typeof payload === 'object') {
    const info = payload as Record<string, unknown>;
    const meta: string[] = [];
    if (typeof info.severity === 'string') {
      meta.push(`严重级别：${info.severity}`);
    }
    if (typeof info.source === 'string' && info.source.length > 0) {
      meta.push(`来源：${info.source}`);
    }
    if (typeof info.dedupeKey === 'string') {
      meta.push(`Dedupe：${info.dedupeKey}`);
    }
    if (Array.isArray(info.tags) && info.tags.length > 0) {
      meta.push(`标签：${info.tags.join(', ')}`);
    }
    if (typeof info.triggeredAt === 'string') {
      meta.push(`时间：${info.triggeredAt}`);
    } else if (info.triggeredAt instanceof Date) {
      meta.push(`时间：${info.triggeredAt.toISOString()}`);
    }
    if (typeof info.occurrences === 'number') {
      meta.push(`触发次数：${info.occurrences}`);
    }
    if (meta.length > 0) {
      lines.push(meta.join(' | '));
    }

    const detail =
      info.payload !== undefined
        ? info.payload
        : info;
    lines.push('', '详细信息：');
    lines.push(formatJson(detail));
  } else if (payload !== undefined) {
    lines.push('', '详细信息：');
    lines.push(formatJson(payload));
  }
  return lines.join('\n');
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null) {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
