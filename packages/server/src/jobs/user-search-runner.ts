import { formatISO } from 'date-fns';

import { cronConfig } from '../config/cron.js';
import { mailConfig } from '../config/mail.js';
import {
  getUserFeedbackItemsByIds,
  type UserFeedbackWithItem,
  markUserFeedbackItemsNotified,
  type FeedbackEntity
} from '../services/feedback-store.js';
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
import { sendFeishuWebhookMessage, buildFeishuTextPayload, type FeishuWebhookPayload } from '../services/feishu.js';

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
const MAX_PUSH_ITEMS = 10;
const MAX_RELEVANT_CANDIDATES = 25;
const YOUTUBE_RECENT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

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
        processStatus: 'success',
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
    try {
      const langRegion = getLanguageRegionFromTimezone(config.timezone);
      const selection = await selectCandidates({
        keywords,
        platforms: activePlatforms,
        logLabel,
        userId,
        langRegion,
        now
      });
      const selectedItems = selection.selectedItems;
      const totalCandidates = selection.candidateCount;
      const successCount = selection.successCount;
      const failCount = selection.failCount;

      const summary = {
        totalCreated: selection.totalCreated,
        totalUpdated: selection.totalUpdated,
        userCreated: selection.userCreated,
        userUpdated: selection.userUpdated,
        startedAt: selection.startedAt,
        finishedAt: selection.finishedAt,
        lastSuccessAt: config.last_notified_at ?? null
      };

      const mailPayload = buildMailContent({
        items: selectedItems,
        summary,
        context: {
          platforms: activePlatforms.join(', '),
          keywords: keywords.join(', '),
          recipient: config.notify_email
        }
      });

      const shouldSendEmail = config.notify_channels.includes('email');
      const shouldSendFeishu = config.notify_channels.includes('feishu');
      const hasNewItems = totalCandidates > 0;
      const allowEmptyNotification = mailConfig.sendWhenEmpty;

      const attemptEmail = shouldSendEmail && (hasNewItems || allowEmptyNotification);
      const attemptFeishu = shouldSendFeishu && Boolean(config.feishu_webhook) && (hasNewItems || allowEmptyNotification);

      let totalSent = 0;
      let messageId: string | undefined;
      let emailDelivered = false;
      let feishuDelivered = false;
      const channelErrors: Record<string, string> = {};
      let emailAccepted = 0;
      let feishuMessagesSent = 0;

      if (attemptEmail) {
        try {
          const sendResult = await sendMail(mailPayload, [config.notify_email]);
          emailAccepted = sendResult.acceptedRecipients;
          messageId = sendResult.messageId;
          emailDelivered = emailAccepted > 0;
          console.log(
            `${logLabel} 邮件发送完成，messageId=${messageId ?? 'n/a'}，新增条数=${selectedItems.length}`
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
          const chunks = chunkArray(selectedItems, MAX_FEISHU_CARD_ITEMS);
          let sentCount = 0;

          for (const chunk of chunks) {
            await sendFeishuWebhookMessage({
            webhook: config.feishu_webhook!,
            payload: buildFeishuCardPayload({
              items: chunk,
              keywords,
              platforms: activePlatforms,
              summary
            })
          });
            sentCount += 1;
          }

          // 追加一条纯文本兜底，便于人工确认消息是否送达
          await sendFeishuWebhookMessage({
            webhook: config.feishu_webhook!,
            payload: buildFeishuTextPayload(
              `本轮定时搜索：新增 ${selectedItems.length} 条，关键词：${keywords.join(
                ', '
              ) || '-'}，平台：${activePlatforms.join(', ') || '-'}。如未看到卡片，请查看机器人消息或刷新群聊。`
            )
          });
          sentCount += 1;
          feishuMessagesSent = sentCount;
          feishuDelivered = true;
          await updateFeishuChannelStatus(userId, { status: 'ok' }).catch(() => undefined);
          console.log(`${logLabel} 飞书通知发送完成，新增条数=${selectedItems.length}，发送卡片 ${chunks.length} 条`);
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

      const deliveredAny = successfulChannels > 0;
      if (attemptedChannels > 0 && !deliveredAny) {
        const errorMessages = Object.values(channelErrors);
        throw new Error(errorMessages[0] ?? '通知发送失败');
      }

      if (deliveredAny) {
        delivered += 1;
      }

      totalSent = deliveredAny ? selectedItems.length : 0;

      const nextRun = computeNextRunAt(slots, config.timezone);
      const shouldUpdateLastNotified = deliveredAny;

      if (shouldUpdateLastNotified && selectedItems.length > 0) {
        await markUserFeedbackItemsNotified(userId, selectedItems.map((item) => item.id)).catch(() => undefined);
      }

      await updateExecutionMetadata({
        userId,
        nextRunAt: nextRun,
        lastRunAt: selection.finishedAt,
        lastNotifiedAt: shouldUpdateLastNotified ? selection.finishedAt : config.last_notified_at ?? null
      });

      const processStatus = failCount > 0
        ? successCount > 0
          ? ('partial' as const)
          : ('failed' as const)
        : ('success' as const);

      const notifyStatus =
        attemptedChannels === 0
          ? null
          : Object.keys(channelErrors).length === 0
            ? ('success' as const)
            : successfulChannels > 0
              ? ('partial' as const)
              : ('failed' as const);

      await recordNotifyJob({
        processStatus,
        notifyStatus: notifyStatus ?? undefined,
        totalNew: selection.userCreated,
        totalSent,
        mailMessageId: messageId,
        runAt: selection.finishedAt,
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
          counts: {
            candidates: totalCandidates,
            selected: selectedItems.length,
            emailAccepted,
            feishuMessagesSent
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
        processStatus: 'failed',
        notifyStatus: undefined,
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
      const metric = formatMetricForFeishu(item) ?? '-';
      const published = item.published_at ?? item.first_seen_at ?? null;
      const publishedText = published ? FEISHU_DATE_FORMATTER.format(published) : '未知';
      const keyword = item.keyword ? escapeFeishuMarkdown(item.keyword) : '-';
      const author = item.author ? escapeFeishuMarkdown(item.author) : '-';

      elements.push({
        tag: 'div',
        text: { tag: 'lark_md', content: `**#${index + 1} ${escapeFeishuMarkdown(item.title)}**` }
      });

      elements.push({
        tag: 'column_set',
        columns: [
          {
            tag: 'column',
            width: 'equal',
            elements: [{ tag: 'markdown', content: `**时间：** ${publishedText}` }]
          },
          {
            tag: 'column',
            width: 'equal',
            elements: [{ tag: 'markdown', content: `**平台：** ${formatPlatformLabel(item.platform)}` }]
          },
          {
            tag: 'column',
            width: 'equal',
            elements: [{ tag: 'markdown', content: `**关键词：** ${keyword}` }]
          }
        ]
      });

      elements.push({
        tag: 'column_set',
        columns: [
          {
            tag: 'column',
            width: 'equal',
            elements: [{ tag: 'markdown', content: `**作者：** ${author}` }]
          },
          {
            tag: 'column',
            width: 'equal',
            elements: [{ tag: 'markdown', content: `**播放量/热度：** ${metric}` }]
          },
          {
            tag: 'column',
            width: 'equal',
            elements: [
              {
                tag: 'markdown',
                content: `**评论数：** ${
                  typeof item.comment_count === 'number' ? NUMBER_FORMATTER.format(item.comment_count) : '-'
                }`
              }
            ]
          }
        ]
      });

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

function getLanguageRegionFromTimezone(timezone?: string | null): { relevanceLanguage?: string; regionCode?: string } | null {
  if (!timezone) return null;
  const map: Record<
    string,
    {
      relevanceLanguage: string;
      regionCode: string;
    }
  > = {
    'Asia/Shanghai': { relevanceLanguage: 'zh-CN', regionCode: 'CN' },
    'Asia/Chongqing': { relevanceLanguage: 'zh-CN', regionCode: 'CN' },
    'Asia/Beijing': { relevanceLanguage: 'zh-CN', regionCode: 'CN' },
    'Asia/Taipei': { relevanceLanguage: 'zh-TW', regionCode: 'TW' },
    'Asia/Hong_Kong': { relevanceLanguage: 'zh-HK', regionCode: 'HK' },
    'Asia/Macau': { relevanceLanguage: 'zh-MO', regionCode: 'MO' },
    'Asia/Tokyo': { relevanceLanguage: 'ja-JP', regionCode: 'JP' },
    'Asia/Seoul': { relevanceLanguage: 'ko-KR', regionCode: 'KR' },
    'Europe/London': { relevanceLanguage: 'en-GB', regionCode: 'GB' },
    'Europe/Berlin': { relevanceLanguage: 'de-DE', regionCode: 'DE' },
    'Europe/Paris': { relevanceLanguage: 'fr-FR', regionCode: 'FR' },
    'America/New_York': { relevanceLanguage: 'en-US', regionCode: 'US' },
    'America/Los_Angeles': { relevanceLanguage: 'en-US', regionCode: 'US' },
    'America/Chicago': { relevanceLanguage: 'en-US', regionCode: 'US' },
    'America/Toronto': { relevanceLanguage: 'en-CA', regionCode: 'CA' },
    'Australia/Sydney': { relevanceLanguage: 'en-AU', regionCode: 'AU' }
  };
  const found = map[timezone];
  return found ?? null;
}

type CandidateSelection = {
  selectedItems: FeedbackEntity[];
  candidateCount: number;
  totalCreated: number;
  totalUpdated: number;
  userCreated: number;
  userUpdated: number;
  startedAt: Date;
  finishedAt: Date;
  successCount: number;
  failCount: number;
};

async function selectCandidates(params: {
  keywords: string[];
  platforms: string[];
  logLabel: string;
  userId: string;
  langRegion: { relevanceLanguage?: string; regionCode?: string } | null;
  now: Date;
}): Promise<CandidateSelection> {
  const startedAt = new Date();
  const candidates: UserFeedbackWithItem[] = [];
  const seenIds = new Set<string>();
  let successCount = 0;
  let failCount = 0;

  let totalCreated = 0;
  let totalUpdated = 0;
  let userCreated = 0;
  let userUpdated = 0;
  let finishedAt = startedAt;

  const addCandidates = async (processedIds: string[]) => {
    if (processedIds.length === 0) return;
    const items = await getUserFeedbackItemsByIds(params.userId, processedIds);
    for (const item of items) {
      if (item.last_notified_at) continue; // 已推送过
      if (seenIds.has(item.feedback.id)) continue;
      candidates.push(item);
      seenIds.add(item.feedback.id);
    }
  };

  // 第一轮：近 30 天，按相关性
  const recentAfter = new Date(params.now.getTime() - YOUTUBE_RECENT_DAYS * DAY_MS).toISOString();
  const firstResult = await runKeywordSync({
    keywords: params.keywords,
    platforms: params.platforms,
    fetchLimit: cronConfig.fetchLimit,
    logLabel: `${params.logLabel}[recent]`,
    userId: params.userId,
    relevanceLanguage: params.langRegion?.relevanceLanguage,
    regionCode: params.langRegion?.regionCode,
    order: 'relevance',
    publishedAfter: recentAfter,
    maxPages: 1
  });
  totalCreated += firstResult.created;
  totalUpdated += firstResult.updated;
  userCreated += firstResult.userCreated;
  userUpdated += firstResult.userUpdated;
  successCount += firstResult.stats.filter((item) => item.success).length;
  failCount += firstResult.stats.filter((item) => !item.success).length;
  finishedAt = firstResult.finishedAt;
  await addCandidates(firstResult.userProcessedIds ?? []);

  // 如不足 10，再补齐一轮相关性（不限日期）
  if (candidates.length < MAX_PUSH_ITEMS) {
    const supplementResult = await runKeywordSync({
      keywords: params.keywords,
      platforms: params.platforms,
      fetchLimit: cronConfig.fetchLimit,
      logLabel: `${params.logLabel}[relevance]`,
      userId: params.userId,
      relevanceLanguage: params.langRegion?.relevanceLanguage,
      regionCode: params.langRegion?.regionCode,
      order: 'relevance',
      maxPages: 1
    });
    totalCreated += supplementResult.created;
    totalUpdated += supplementResult.updated;
    userCreated += supplementResult.userCreated;
    userUpdated += supplementResult.userUpdated;
    successCount += supplementResult.stats.filter((item) => item.success).length;
    failCount += supplementResult.stats.filter((item) => !item.success).length;
    finishedAt = supplementResult.finishedAt;
    await addCandidates(supplementResult.userProcessedIds ?? []);
  }

  const relevantCandidates = candidates
    .map((item) => ({
      feedback: item.feedback,
      priority: getMatchPriority((item.feedback.metadata as any)?.matchLevel)
    }))
    .filter((item) => item.priority > 0 && item.priority <= 5);

  const sortedByRelevance = relevantCandidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const viewDiff = (b.feedback.view_count ?? 0) - (a.feedback.view_count ?? 0);
    if (viewDiff !== 0) return viewDiff;
    const commentDiff = (b.feedback.comment_count ?? 0) - (a.feedback.comment_count ?? 0);
    if (commentDiff !== 0) return commentDiff;
    const dateA = a.feedback.published_at ? new Date(a.feedback.published_at).getTime() : 0;
    const dateB = b.feedback.published_at ? new Date(b.feedback.published_at).getTime() : 0;
    return dateB - dateA;
  });

  const candidateCount = sortedByRelevance.length;
  const candidatePool = sortedByRelevance.slice(0, MAX_RELEVANT_CANDIDATES).map((item) => item.feedback);

  const selectedItems = [...candidatePool]
    .sort((a, b) => {
      const viewDiff = (b.view_count ?? 0) - (a.view_count ?? 0);
      if (viewDiff !== 0) return viewDiff;
      const commentDiff = (b.comment_count ?? 0) - (a.comment_count ?? 0);
      if (commentDiff !== 0) return commentDiff;
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, MAX_PUSH_ITEMS);

  return {
    selectedItems,
    totalCreated,
    totalUpdated,
    userCreated,
    userUpdated,
    startedAt,
    finishedAt,
    candidateCount,
    successCount,
    failCount
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function getMatchPriority(matchLevel?: string | null): number {
  switch ((matchLevel ?? '').toUpperCase()) {
    case 'A':
      return 1; // 标题包含短语
    case 'B':
      return 2; // 标题包含全部词
    case 'C':
      return 3; // 标签命中
    case 'D':
      return 4; // 描述命中
    case 'E':
      return 5; // 任意词命中
    default:
      return 99; // 无命中，丢弃
  }
}
