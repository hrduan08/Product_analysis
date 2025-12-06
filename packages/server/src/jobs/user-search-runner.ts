import { formatISO } from 'date-fns';

import { cronConfig } from '../config/cron.js';
import { mailConfig } from '../config/mail.js';
import { getNewFeedbackItemsSince } from '../services/feedback-store.js';
import type { FeedbackEntity } from '../services/feedback-store.js';
import {
  computeNextRunAt,
  getSupportedProviderPlatforms,
  listDueUserSearchConfigs,
  updateExecutionMetadata,
  updateFeishuChannelStatus
} from '../services/search-config.js';
import { buildMailContent } from '../services/mail/composer.js';
import { sendMail } from '../services/mail/sender.js';
import { recordNotifyJob } from '../services/notify-jobs.js';
import { notifyAlert } from '../services/alert/notifier.js';
import { runKeywordSync } from './keyword-sync.js';
import { getTierLimitsByStatus } from '../config/search-limits.js';
import type { Prisma } from '../generated/prisma/client.js';
import { YoutubeRateLimitError } from '../services/youtube/quota-manager.js';
import { sendFeishuWebhookMessage, type FeishuWebhookPayload } from '../services/feishu.js';

export type UserSearchJobResult = {
  processed: number;
  triggered: number;
  delivered: number;
  skipped: number;
  failed: number;
};

const FEISHU_DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const NUMBER_FORMATTER = new Intl.NumberFormat('zh-CN');
const MAX_FEISHU_CARD_ITEMS = 5;

export async function runUserSearchConfigJobs(now: Date = new Date()): Promise<UserSearchJobResult> {
  const configs = await listDueUserSearchConfigs(now);

  if (configs.length === 0) {
    return { processed: 0, triggered: 0, delivered: 0, skipped: 0, failed: 0 };
  }

  let processed = 0;
  let triggered = 0;
  let delivered = 0;
  let skipped = 0;
  let failed = 0;

  for (const config of configs) {
    processed += 1;
    const userId = config.user_id;
    const logLabel = `[user-cron:${userId}]`;
    const tierLimits = getTierLimitsByStatus(config.user.status as Prisma.UserStatus);
    const keywords = clampToLimit(config.keywords, tierLimits.maxKeywords);
    const slots = clampToLimit(config.slots, tierLimits.maxSlots);
    const activePlatforms = getSupportedProviderPlatforms(config.platforms);

    if (keywords.length === 0 || slots.length === 0 || activePlatforms.length === 0) {
      skipped += 1;
      const nextRun = computeNextRunAt(slots, config.timezone);
      await updateExecutionMetadata({
        userId,
        nextRunAt: nextRun,
        lastRunAt: now,
        lastNotifiedAt: config.last_notified_at ?? null
      });
      await recordNotifyJob({
        status: activePlatforms.length === 0 ? 'partial' : 'success',
        totalNew: 0,
        totalSent: 0,
        userId,
        context: {
          reason: activePlatforms.length === 0 ? 'no_supported_platform' : 'missing_keywords_or_slots',
          platforms: config.platforms,
          keywords,
          slots
        }
      });
      console.warn(
        `${logLabel} 跳过执行，原因=${activePlatforms.length === 0 ? '未选择受支持平台' : '关键词或时间未配置'}`
      );
      continue;
    }

    triggered += 1;
    const reference = config.last_notified_at ?? new Date(0);

    try {
      const syncResult = await runKeywordSync({
        keywords,
        platforms: activePlatforms,
        fetchLimit: cronConfig.fetchLimit,
        logLabel
      });

      const newItems = await getNewFeedbackItemsSince(reference, {
        platforms: activePlatforms,
        keywords
      });

      const summary = {
        totalCreated: syncResult.created,
        totalUpdated: syncResult.updated,
        startedAt: syncResult.startedAt,
        finishedAt: syncResult.finishedAt,
        lastSuccessAt: config.last_notified_at ?? null
      };

      const mailPayload = buildMailContent({
        items: newItems,
        summary,
        context: {
          platforms: activePlatforms.join(', '),
          keywords: keywords.join(', '),
          recipient: config.notify_email
        }
      });

      const shouldSendEmail = config.notify_channels.includes('email');
      const shouldSendFeishu = config.notify_channels.includes('feishu');
      const hasNewItems = newItems.length > 0;
      const allowEmptyNotification = mailConfig.sendWhenEmpty;

      const attemptEmail = shouldSendEmail && (hasNewItems || allowEmptyNotification);
      const attemptFeishu = shouldSendFeishu && Boolean(config.feishu_webhook) && (hasNewItems || allowEmptyNotification);

      let totalSent = 0;
      let messageId: string | undefined;
      let emailDelivered = false;
      let feishuDelivered = false;
      const channelErrors: Record<string, string> = {};

      if (attemptEmail) {
        try {
          const sendResult = await sendMail(mailPayload, [config.notify_email]);
          totalSent = sendResult.acceptedRecipients;
          messageId = sendResult.messageId;
          emailDelivered = totalSent > 0;
          console.log(
            `${logLabel} 邮件发送完成，messageId=${messageId ?? 'n/a'}，新增条数=${newItems.length}`
          );
        } catch (error) {
          channelErrors.email = error instanceof Error ? error.message : String(error);
          console.error(`${logLabel} 邮件发送失败`, error);
        }
      } else if (shouldSendEmail) {
        console.log(`${logLabel} 邮件通知已开启，但无新增内容且未配置空通知，跳过发送`);
      }

      if (attemptFeishu) {
        try {
          await sendFeishuWebhookMessage({
            webhook: config.feishu_webhook!,
            payload: buildFeishuCardPayload({
              items: newItems,
              keywords,
              platforms: activePlatforms,
              summary
            })
          });
          feishuDelivered = true;
          await updateFeishuChannelStatus(userId, { status: 'ok' }).catch(() => undefined);
          console.log(`${logLabel} 飞书通知发送完成，新增条数=${newItems.length}`);
        } catch (error) {
          channelErrors.feishu = error instanceof Error ? error.message : String(error);
          await updateFeishuChannelStatus(userId, { status: 'failed' }).catch(() => undefined);
          console.error(`${logLabel} 飞书通知发送失败`, error);
        }
      } else if (shouldSendFeishu) {
        if (!config.feishu_webhook) {
          console.warn(`${logLabel} 已选择飞书通知但未配置 Webhook，已自动跳过`);
        } else {
          console.log(`${logLabel} 飞书通知已开启，但无新增内容且未配置空通知，跳过发送`);
        }
      }

      const attemptedChannels = Number(attemptEmail) + Number(attemptFeishu);
      const successfulChannels = Number(emailDelivered && attemptEmail) + Number(feishuDelivered && attemptFeishu);

      if (attemptedChannels > 0 && successfulChannels === 0) {
        const errorMessages = Object.values(channelErrors);
        throw new Error(errorMessages[0] ?? '通知发送失败');
      }

      if (emailDelivered || feishuDelivered) {
        delivered += 1;
      }

      const nextRun = computeNextRunAt(slots, config.timezone);
      const shouldUpdateLastNotified = emailDelivered || feishuDelivered || hasNewItems;

      await updateExecutionMetadata({
        userId,
        nextRunAt: nextRun,
        lastRunAt: syncResult.finishedAt,
        lastNotifiedAt: shouldUpdateLastNotified ? syncResult.finishedAt : config.last_notified_at ?? null
      });

      const jobStatus = Object.keys(channelErrors).length > 0 ? 'partial' : 'success';

      await recordNotifyJob({
        status: jobStatus,
        totalNew: newItems.length,
        totalSent,
        mailMessageId: messageId,
        runAt: syncResult.finishedAt,
        userId,
        context: {
          platforms: config.platforms,
          keywords,
          slots,
          notifyEmail: config.notify_email,
          notifyChannels: config.notify_channels,
          feishuConfigured: Boolean(config.feishu_webhook),
          channels: {
            email: {
              enabled: shouldSendEmail,
              attempted: attemptEmail,
              delivered: emailDelivered,
              error: channelErrors.email ?? null
            },
            feishu: {
              enabled: shouldSendFeishu,
              attempted: attemptFeishu,
              delivered: feishuDelivered,
              error: channelErrors.feishu ?? null
            }
          },
          nextRunAt: nextRun ? formatISO(nextRun) : null
        }
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${logLabel} 执行失败`, error);

      const nextRun = error instanceof YoutubeRateLimitError
        ? new Date(now.getTime() + Math.max((error.retryAfterSeconds ?? 60) * 1000, 1000))
        : computeNextRunAt(slots, config.timezone);
      await updateExecutionMetadata({
        userId,
        nextRunAt: nextRun,
        lastRunAt: now,
        lastNotifiedAt: config.last_notified_at ?? null
      });

      await recordNotifyJob({
        status: error instanceof YoutubeRateLimitError ? 'partial' : 'failed',
        totalNew: 0,
        totalSent: 0,
        errorMessage: message,
        userId,
        context: {
          platforms: config.platforms,
          keywords,
          slots,
          notifyEmail: config.notify_email,
          notifyChannels: config.notify_channels,
          feishuConfigured: Boolean(config.feishu_webhook),
          rateLimited: error instanceof YoutubeRateLimitError
        }
      });

      void notifyAlert('用户搜索配置任务失败', {
        message,
        userId,
        keywords,
        platforms: config.platforms
      }, {
        severity: 'warning',
        dedupeKey: `user-cron:${userId}:error`,
        tags: ['cron', 'user-config'],
        source: 'user-search'
      }).catch((alertError) => {
        console.error(`${logLabel} 发送告警失败`, alertError);
      });
    }
  }

  return { processed, triggered, delivered, skipped, failed };
}

function clampToLimit<T>(values: T[], limit: number): T[] {
  if (limit <= 0) {
    return [];
  }
  if (values.length <= limit) {
    return [...values];
  }
  return values.slice(0, limit);
}

function buildFeishuCardPayload(input: {
  items: FeedbackEntity[];
  keywords: string[];
  platforms: string[];
  summary: {
    finishedAt: Date;
  };
}): FeishuWebhookPayload {
  const keywordText = input.keywords.length ? input.keywords.join('、') : '未设置';
  const platformText =
    input.platforms.length > 0 ? input.platforms.map(formatPlatformLabel).join('、') : '未选择';
  const elements: Array<Record<string, unknown>> = [
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**执行时间**：${FEISHU_DATE_FORMATTER.format(input.summary.finishedAt)}\n**新增内容**：${input.items.length} 条`
      }
    },
    {
      tag: 'div',
      fields: [
        {
          is_short: true,
          text: { tag: 'lark_md', content: `**关键词**\n${escapeFeishuMarkdown(keywordText)}` }
        },
        {
          is_short: true,
          text: { tag: 'lark_md', content: `**平台**\n${escapeFeishuMarkdown(platformText)}` }
        }
      ]
    },
    { tag: 'hr' }
  ];

  if (input.items.length === 0) {
    elements.push({
      tag: 'markdown',
      content: '本轮未检测到新的内容。'
    });
  } else {
    const limitedItems = input.items.slice(0, MAX_FEISHU_CARD_ITEMS);
    limitedItems.forEach((item, index) => {
      const metric = formatMetricForFeishu(item);
      const detailLines = [
        `**#${index + 1} ${escapeFeishuMarkdown(item.title)}**`,
        item.author ? `作者：${escapeFeishuMarkdown(item.author)}` : null,
        metric ? `${item.platform === 'youtube' ? '播放量' : '热度'}：${metric}` : null,
        item.published_at ? `发布时间：${FEISHU_DATE_FORMATTER.format(item.published_at)}` : null
      ]
        .filter(Boolean)
        .join('\n');
      const thumbnailUrl = getThumbnailFromEntity(item);

      if (thumbnailUrl) {
        elements.push({
          tag: 'column_set',
          columns: [
            {
              tag: 'column',
              width: 'stretch',
              elements: [
                {
                  tag: 'div',
                  text: { tag: 'lark_md', content: detailLines }
                }
              ]
            },
            {
              tag: 'column',
              width: 'auto',
              elements: [
                {
                  tag: 'img',
                  img_key: thumbnailUrl,
                  alt: {
                    tag: 'plain_text',
                    content: '封面图'
                  },
                  mode: 'fit_vertical'
                }
              ]
            }
          ]
        });
      } else {
        elements.push({
          tag: 'div',
          text: { tag: 'lark_md', content: detailLines }
        });
      }

      if (item.url) {
        elements.push({
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看内容' },
              url: item.url,
              type: 'primary',
              value: {}
            }
          ]
        });
      }

      if (index < limitedItems.length - 1) {
        elements.push({ tag: 'hr' });
      }
    });

    if (input.items.length > MAX_FEISHU_CARD_ITEMS) {
      elements.push({
        tag: 'markdown',
        content: `还有 ${input.items.length - MAX_FEISHU_CARD_ITEMS} 条内容未展示，请前往控制台查看。`
      });
    }
  }

  elements.push({
    tag: 'note',
    elements: [{ tag: 'plain_text', content: '如需关闭飞书通知，请前往搜索配置控制台修改。' }]
  });

  return {
    msg_type: 'interactive',
    card: {
      config: {
        enable_forward: true,
        wide_screen_mode: true
      },
      header: {
        template: 'turquoise',
        title: { tag: 'plain_text', content: '定时搜索提醒' }
      },
      elements
    }
  };
}

function formatMetricForFeishu(item: FeedbackEntity): string | null {
  if (item.platform === 'youtube' && typeof item.view_count === 'number') {
    return NUMBER_FORMATTER.format(item.view_count);
  }
  if (typeof item.score === 'number') {
    return NUMBER_FORMATTER.format(item.score);
  }
  if (typeof item.comment_count === 'number') {
    return NUMBER_FORMATTER.format(item.comment_count);
  }
  return null;
}

function formatPlatformLabel(platform: string): string {
  switch (platform) {
    case 'youtube':
      return 'YouTube';
    case 'reddit':
      return 'Reddit';
    case 'x':
      return 'X';
    case 'facebook':
      return 'Facebook';
    default:
      return platform;
  }
}

function escapeFeishuMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+\-!>])/g, '\\$1');
}

function getThumbnailFromEntity(item: FeedbackEntity): string | null {
  if (typeof item.thumbnail_url === 'string' && item.thumbnail_url.trim().length > 0) {
    return item.thumbnail_url;
  }
  if (item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)) {
    const thumbnail = (item.metadata as Record<string, unknown>).thumbnailUrl;
    if (typeof thumbnail === 'string' && thumbnail.trim().length > 0) {
      return thumbnail;
    }
  }
  return null;
}
