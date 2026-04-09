import { formatISO } from 'date-fns';

import { cronConfig } from '../config/cron.js';
import { mailConfig } from '../config/mail.js';
import {
  getUserFeedbackItemsByIds,
  listUserUnnotifiedFeedback,
  markUserFeedbackItemsNotified,
  type FeedbackEntity,
  upsertFeedbackItems,
  upsertUserFeedbackItems
} from '../services/feedback-store.js';
import {
  computeNextAutoRunAt,
  getSupportedProviderPlatforms,
  listDueUserSearchConfigs,
  resolveRedditCommunityName,
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
import { RedditProvider } from '../providers/reddit-provider.js';
import type { FeedbackItem, Platform } from '../types/search.js';

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
const MAX_PER_PLATFORM_PUSH_ITEMS = 5;
const REDDIT_FETCH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const YOUTUBE_FETCH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REDDIT_BACKLOG_WINDOW_DAYS = 3;
const YOUTUBE_BACKLOG_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const redditProvider = new RedditProvider();

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

    const activePlatforms = getSupportedProviderPlatforms(config.platforms);
    const redditCommunities = clampToLimit(config.reddit_communities, tierLimits.maxRedditCommunities);
    const redditKeywords = clampToLimit(config.reddit_keywords, tierLimits.maxRedditKeywords);
    const youtubeKeywords = clampToLimit(config.youtube_keywords, tierLimits.maxYoutubeKeywords);

    const hasRedditTarget = activePlatforms.includes('reddit') && redditCommunities.length > 0;
    const hasYoutubeTarget = activePlatforms.includes('youtube') && youtubeKeywords.length > 0;

    if (!hasRedditTarget && !hasYoutubeTarget) {
      skipped += 1;
      const nextRun = computeNextAutoRunAt({
        platforms: activePlatforms,
        redditCommunities,
        youtubeKeywords,
        redditLastRunAt: config.reddit_last_run_at ?? null,
        youtubeLastRunAt: config.youtube_last_run_at ?? null,
        now
      });

      await updateExecutionMetadata({
        userId,
        nextRunAt: nextRun,
        lastNotifiedAt: config.last_notified_at ?? null,
        redditLastRunAt: config.reddit_last_run_at ?? null,
        youtubeLastRunAt: config.youtube_last_run_at ?? null
      });

      await recordNotifyJob({
        processStatus: 'success',
        totalNew: 0,
        totalSent: 0,
        userId,
        context: {
          reason: 'missing_platform_targets',
          platforms: config.platforms,
          redditCommunities,
          redditKeywords,
          youtubeKeywords
        }
      });

      console.warn(`${logLabel} 跳过执行，原因=未配置可执行源`);
      continue;
    }

    triggered += 1;
    try {
      const langRegion = getLanguageRegionFromTimezone(config.timezone);
      const selection = await selectCandidates({
        activePlatforms,
        logLabel,
        now,
        redditCommunities,
        redditKeywords,
        userId,
        youtubeKeywords,
        youtubeLastRunAt: config.youtube_last_run_at ?? null,
        redditLastRunAt: config.reddit_last_run_at ?? null,
        langRegion
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

      const allKeywords = mergeKeywordsForDisplay(youtubeKeywords, redditKeywords);

      const mailPayload = buildMailContent({
        items: selectedItems,
        summary,
        context: {
          platforms: activePlatforms.join(', '),
          keywords: allKeywords.join(', '),
          recipient: config.notify_email
        }
      });

      const shouldSendEmail = config.notify_channels.includes('email');
      const shouldSendFeishu = config.notify_channels.includes('feishu');
      const hasNewItems = totalCandidates > 0;
      const allowEmptyNotification = mailConfig.sendWhenEmpty;

      const attemptEmail = shouldSendEmail && (hasNewItems || allowEmptyNotification);
      const attemptFeishu =
        shouldSendFeishu && Boolean(config.feishu_webhook) && (hasNewItems || allowEmptyNotification);

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
          console.log(`${logLabel} 邮件发送完成，messageId=${messageId ?? 'n/a'}，新增条数=${selectedItems.length}`);
        } catch (error) {
          channelErrors.email = error instanceof Error ? error.message : String(error);
          console.error(`${logLabel} 邮件发送失败`, error);
        }
      } else if (shouldSendEmail) {
        console.log(`${logLabel} 邮件通知已开启，但无新增内容且未配置空通知，跳过发送`);
      }

      if (attemptFeishu) {
        try {
          if (selectedItems.length === 0) {
            console.log(`${logLabel} 飞书通知已开启，但无新增内容且不再发送汇总文本，跳过发送`);
          } else {
            let sentCount = 0;
            for (const item of selectedItems) {
              await sendFeishuWebhookMessage({
                webhook: config.feishu_webhook!,
                payload: buildFeishuCardPayload({
                  items: [item],
                  keywords: allKeywords,
                  platforms: activePlatforms,
                  summary
                })
              });
              sentCount += 1;
            }
            feishuMessagesSent = sentCount;
            feishuDelivered = true;
            await updateFeishuChannelStatus(userId, { status: 'ok' }).catch(() => undefined);
            console.log(`${logLabel} 飞书通知发送完成，逐条发送 ${sentCount} 条卡片`);
          }
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

      const nextRun = computeNextAutoRunAt({
        platforms: activePlatforms,
        redditCommunities,
        youtubeKeywords,
        redditLastRunAt: selection.redditLastRunAt ?? config.reddit_last_run_at ?? null,
        youtubeLastRunAt: selection.youtubeLastRunAt ?? config.youtube_last_run_at ?? null,
        now: selection.finishedAt
      });
      const shouldUpdateLastNotified = deliveredAny;

      if (shouldUpdateLastNotified && selectedItems.length > 0) {
        await markUserFeedbackItemsNotified(userId, selectedItems.map((item) => item.id)).catch(() => undefined);
      }

      await updateExecutionMetadata({
        userId,
        nextRunAt: nextRun,
        lastNotifiedAt: shouldUpdateLastNotified ? selection.finishedAt : config.last_notified_at ?? null,
        redditLastRunAt: selection.redditLastRunAt ?? config.reddit_last_run_at ?? null,
        youtubeLastRunAt: selection.youtubeLastRunAt ?? config.youtube_last_run_at ?? null
      });

      const processStatus = failCount > 0 ? (successCount > 0 ? ('partial' as const) : ('failed' as const)) : ('success' as const);

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
          keywords: allKeywords,
          redditCommunities,
          redditKeywords,
          youtubeKeywords,
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
            feishuMessagesSent,
            redditSelected: selectedItems.filter((item) => item.platform === 'reddit').length,
            youtubeSelected: selectedItems.filter((item) => item.platform === 'youtube').length
          },
          execution: {
            redditRunAt: selection.redditLastRunAt ? formatISO(selection.redditLastRunAt) : null,
            youtubeRunAt: selection.youtubeLastRunAt ? formatISO(selection.youtubeLastRunAt) : null
          },
          nextRunAt: nextRun ? formatISO(nextRun) : null
        }
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${logLabel} 执行失败`, error);

      const nextRun =
        error instanceof YoutubeRateLimitError
          ? new Date(now.getTime() + Math.max((error.retryAfterSeconds ?? 60) * 1000, 1000))
          : new Date(now.getTime() + 5 * 60 * 1000);

      await updateExecutionMetadata({
        userId,
        nextRunAt: nextRun,
        lastNotifiedAt: config.last_notified_at ?? null,
        redditLastRunAt: config.reddit_last_run_at ?? null,
        youtubeLastRunAt: config.youtube_last_run_at ?? null
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
          keywords: mergeKeywordsForDisplay(youtubeKeywords, redditKeywords),
          redditCommunities,
          redditKeywords,
          youtubeKeywords,
          notifyEmail: config.notify_email,
          notifyChannels: config.notify_channels,
          feishuConfigured: Boolean(config.feishu_webhook),
          rateLimited: error instanceof YoutubeRateLimitError
        }
      });

      void notifyAlert(
        '用户搜索配置任务失败',
        {
          message,
          userId,
          keywords: mergeKeywordsForDisplay(youtubeKeywords, redditKeywords),
          platforms: config.platforms
        },
        {
          severity: 'warning',
          dedupeKey: `user-cron:${userId}:error`,
          tags: ['cron', 'user-config'],
          source: 'user-search'
        }
      ).catch((alertError) => {
        console.error(`${logLabel} 发送告警失败`, alertError);
      });
    }
  }

  return { processed, triggered, delivered, skipped, failed };
}

function mergeKeywordsForDisplay(youtubeKeywords: string[], redditKeywords: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const keyword of [...youtubeKeywords, ...redditKeywords]) {
    const key = keyword.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(keyword.trim());
  }
  return result;
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
  const elements: Array<Record<string, unknown>> = [];
  const headerTitle =
    input.items.length > 0 ? input.items[0].title || '定时搜索提醒' : '定时搜索提醒';

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
  }

  return {
    msg_type: 'interactive',
    card: {
      config: {
        enable_forward: true,
        wide_screen_mode: true
      },
      header: {
        template: 'turquoise',
        title: { tag: 'plain_text', content: headerTitle }
      },
      elements
    }
  };
}

function formatMetricForFeishu(item: FeedbackEntity): string | null {
  if (item.platform === 'youtube' && typeof item.view_count === 'number') {
    return NUMBER_FORMATTER.format(item.view_count);
  }
  if (item.platform === 'reddit' && typeof item.score === 'number') {
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

function getLanguageRegionFromTimezone(
  timezone?: string | null
): { relevanceLanguage?: string; regionCode?: string } | null {
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
  redditLastRunAt: Date | null;
  youtubeLastRunAt: Date | null;
};

async function selectCandidates(params: {
  activePlatforms: Platform[];
  logLabel: string;
  now: Date;
  redditCommunities: string[];
  redditKeywords: string[];
  userId: string;
  youtubeKeywords: string[];
  youtubeLastRunAt: Date | null;
  redditLastRunAt: Date | null;
  langRegion: { relevanceLanguage?: string; regionCode?: string } | null;
}): Promise<CandidateSelection> {
  const startedAt = new Date();
  const processedIds = new Set<string>();

  let successCount = 0;
  let failCount = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let userCreated = 0;
  let userUpdated = 0;
  let finishedAt = startedAt;
  let redditLastRunAt = params.redditLastRunAt;
  let youtubeLastRunAt = params.youtubeLastRunAt;

  const shouldRunReddit =
    params.activePlatforms.includes('reddit') &&
    params.redditCommunities.length > 0 &&
    isPlatformDue(params.redditLastRunAt, REDDIT_FETCH_INTERVAL_MS, params.now);

  if (shouldRunReddit) {
    const redditRun = await runRedditCommunityIncremental({
      userId: params.userId,
      communities: params.redditCommunities,
      keywords: params.redditKeywords,
      fetchLimit: cronConfig.fetchLimit,
      logLabel: `${params.logLabel}[reddit]`
    });

    totalCreated += redditRun.created;
    totalUpdated += redditRun.updated;
    userCreated += redditRun.userCreated;
    userUpdated += redditRun.userUpdated;
    successCount += redditRun.successCount;
    failCount += redditRun.failCount;
    finishedAt = redditRun.finishedAt;
    redditLastRunAt = redditRun.finishedAt;
    redditRun.userProcessedIds.forEach((id) => processedIds.add(id));
  }

  const shouldRunYoutube =
    params.activePlatforms.includes('youtube') &&
    params.youtubeKeywords.length > 0 &&
    isPlatformDue(params.youtubeLastRunAt, YOUTUBE_FETCH_INTERVAL_MS, params.now);

  if (shouldRunYoutube) {
    const youtubeResult = await runKeywordSync({
      keywords: params.youtubeKeywords,
      platforms: ['youtube'],
      fetchLimit: cronConfig.fetchLimit,
      logLabel: `${params.logLabel}[youtube]`,
      userId: params.userId,
      relevanceLanguage: params.langRegion?.relevanceLanguage,
      regionCode: params.langRegion?.regionCode,
      order: 'date',
      publishedAfter: params.youtubeLastRunAt
        ? new Date(params.youtubeLastRunAt.getTime() - 6 * 60 * 60 * 1000).toISOString()
        : new Date(params.now.getTime() - 2 * DAY_MS).toISOString(),
      maxPages: 1
    });

    totalCreated += youtubeResult.created;
    totalUpdated += youtubeResult.updated;
    userCreated += youtubeResult.userCreated;
    userUpdated += youtubeResult.userUpdated;
    successCount += youtubeResult.stats.filter((item) => item.success).length;
    failCount += youtubeResult.stats.filter((item) => !item.success).length;
    finishedAt = youtubeResult.finishedAt;
    youtubeLastRunAt = youtubeResult.finishedAt;
    for (const id of youtubeResult.userProcessedIds ?? []) {
      processedIds.add(id);
    }
  }

  const processedRecords = await getUserFeedbackItemsByIds(params.userId, Array.from(processedIds));

  const backlogSince = new Date(params.now.getTime() - Math.max(REDDIT_BACKLOG_WINDOW_DAYS, YOUTUBE_BACKLOG_WINDOW_DAYS) * DAY_MS);
  const backlogRecords = await listUserUnnotifiedFeedback({
    userId: params.userId,
    platforms: params.activePlatforms,
    since: backlogSince,
    limit: 500
  });

  const allCandidateMap = new Map<string, FeedbackEntity>();
  const communitySet = new Set(
    params.redditCommunities
      .map((item) => resolveRedditCommunityName(item)?.toLowerCase())
      .filter((item): item is string => Boolean(item))
  );
  const redditKeywordSet = new Set(params.redditKeywords.map((item) => item.toLowerCase()));
  const youtubeKeywordSet = new Set(params.youtubeKeywords.map((item) => item.toLowerCase()));

  for (const record of [...processedRecords, ...backlogRecords]) {
    const feedback = record.feedback;
    if (record.last_notified_at) {
      continue;
    }
    if (!isRelevantCandidate(feedback, {
      communitySet,
      redditKeywordSet,
      youtubeKeywordSet,
      now: params.now
    })) {
      continue;
    }
    allCandidateMap.set(feedback.id, feedback);
  }

  const allCandidates = Array.from(allCandidateMap.values());
  const youtubeCandidates = allCandidates.filter((item) => item.platform === 'youtube');
  const redditCandidates = allCandidates.filter((item) => item.platform === 'reddit');

  const selectedYoutube = sortPlatformCandidates(youtubeCandidates).slice(0, MAX_PER_PLATFORM_PUSH_ITEMS);
  const selectedReddit = sortPlatformCandidates(redditCandidates).slice(0, MAX_PER_PLATFORM_PUSH_ITEMS);

  const selectedItems = [...selectedYoutube, ...selectedReddit];

  return {
    selectedItems,
    totalCreated,
    totalUpdated,
    userCreated,
    userUpdated,
    startedAt,
    finishedAt,
    candidateCount: allCandidates.length,
    successCount,
    failCount,
    redditLastRunAt,
    youtubeLastRunAt
  };
}

function sortPlatformCandidates(items: FeedbackEntity[]): FeedbackEntity[] {
  return [...items].sort((a, b) => {
    const priorityDiff = getMatchPriority((a.metadata as any)?.matchLevel) - getMatchPriority((b.metadata as any)?.matchLevel);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    if (a.platform === 'youtube' || b.platform === 'youtube') {
      const viewDiff = (b.view_count ?? 0) - (a.view_count ?? 0);
      if (viewDiff !== 0) return viewDiff;
    }

    if (a.platform === 'reddit' || b.platform === 'reddit') {
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
    }

    const commentDiff = (b.comment_count ?? 0) - (a.comment_count ?? 0);
    if (commentDiff !== 0) return commentDiff;

    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return dateB - dateA;
  });
}

function isRelevantCandidate(
  feedback: FeedbackEntity,
  options: {
    communitySet: Set<string>;
    redditKeywordSet: Set<string>;
    youtubeKeywordSet: Set<string>;
    now: Date;
  }
): boolean {
  const ageMs = options.now.getTime() - (feedback.published_at?.getTime() ?? feedback.first_seen_at?.getTime() ?? 0);
  if (feedback.platform === 'youtube') {
    if (ageMs > YOUTUBE_BACKLOG_WINDOW_DAYS * DAY_MS) {
      return false;
    }
    if (options.youtubeKeywordSet.size === 0) {
      return false;
    }
    return options.youtubeKeywordSet.has((feedback.keyword ?? '').toLowerCase());
  }

  if (feedback.platform === 'reddit') {
    if (ageMs > REDDIT_BACKLOG_WINDOW_DAYS * DAY_MS) {
      return false;
    }
    const metadata = (feedback.metadata ?? {}) as Record<string, unknown>;
    const labels = Array.isArray(metadata.labels)
      ? metadata.labels.map((item) => String(item).toLowerCase())
      : [];

    const belongsToCommunity = labels.some((label) => options.communitySet.has(label));
    if (!belongsToCommunity) {
      return false;
    }

    if (options.redditKeywordSet.size === 0) {
      return true;
    }

    return options.redditKeywordSet.has((feedback.keyword ?? '').toLowerCase());
  }

  return false;
}

function isPlatformDue(lastRunAt: Date | null, intervalMs: number, now: Date): boolean {
  if (!lastRunAt) {
    return true;
  }
  return now.getTime() - lastRunAt.getTime() >= intervalMs;
}

type CommunitySyncResult = {
  created: number;
  updated: number;
  userCreated: number;
  userUpdated: number;
  userProcessedIds: string[];
  successCount: number;
  failCount: number;
  finishedAt: Date;
};

async function runRedditCommunityIncremental(params: {
  userId: string;
  communities: string[];
  keywords: string[];
  fetchLimit: number;
  logLabel: string;
}): Promise<CommunitySyncResult> {
  let created = 0;
  let updated = 0;
  let userCreated = 0;
  let userUpdated = 0;
  const userProcessedIds: string[] = [];
  let successCount = 0;
  let failCount = 0;
  let finishedAt = new Date();

  for (const source of params.communities) {
    const subreddit = resolveRedditCommunityName(source);
    if (!subreddit) {
      failCount += 1;
      console.warn(`${params.logLabel} 无法识别社区来源：${source}`);
      continue;
    }

    try {
      const result = await redditProvider.search({
        query: `subreddit:${subreddit}`,
        subreddit,
        limit: params.fetchLimit
      });

      const scopedItems = matchRedditItemsByKeywords(result.items, params.keywords, subreddit);
      if (scopedItems.length === 0) {
        successCount += 1;
        continue;
      }

      const groups = groupByKeyword(scopedItems);
      for (const [keyword, items] of groups.entries()) {
        const persist = await upsertFeedbackItems('reddit', keyword, items);
        created += persist.created;
        updated += persist.updated;

        const userResult = await upsertUserFeedbackItems(
          params.userId,
          persist.processedItems.map((item) => ({
            feedbackItemId: item.id,
            seenAt: item.seenAt
          }))
        );

        userCreated += userResult.created;
        userUpdated += userResult.updated;
        userProcessedIds.push(...userResult.processedIds);
      }

      successCount += 1;
      finishedAt = new Date();
      console.log(`${params.logLabel} 社区 r/${subreddit} 抓取 ${result.items.length} 条，匹配 ${scopedItems.length} 条`);
    } catch (error) {
      failCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`${params.logLabel} 社区 r/${subreddit} 执行失败：${message}`);
    }
  }

  return {
    created,
    updated,
    userCreated,
    userUpdated,
    userProcessedIds,
    successCount,
    failCount,
    finishedAt
  };
}

function groupByKeyword(items: FeedbackItem[]): Map<string, FeedbackItem[]> {
  const grouped = new Map<string, FeedbackItem[]>();
  for (const item of items) {
    const key = item.keyword.trim();
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }
  return grouped;
}

function matchRedditItemsByKeywords(items: FeedbackItem[], keywords: string[], subreddit: string): FeedbackItem[] {
  if (keywords.length === 0) {
    return items.map((item) => ({
      ...item,
      keyword: `r/${subreddit}`,
      matchLevel: 'A'
    }));
  }

  const scoped: FeedbackItem[] = [];
  for (const item of items) {
    const best = pickBestKeyword(item, keywords);
    if (!best) {
      continue;
    }
    scoped.push({
      ...item,
      keyword: best.keyword,
      matchLevel: best.matchLevel
    });
  }
  return scoped;
}

function pickBestKeyword(item: FeedbackItem, keywords: string[]): { keyword: string; matchLevel: string } | null {
  let best: { keyword: string; matchLevel: string } | null = null;
  let bestPriority = Number.MAX_SAFE_INTEGER;

  for (const keyword of keywords) {
    const matchLevel = computeMatchLevel(item, keyword);
    const priority = getMatchPriority(matchLevel);
    if (priority > 5) {
      continue;
    }
    if (priority < bestPriority) {
      bestPriority = priority;
      best = { keyword, matchLevel };
    }
  }

  return best;
}

function computeMatchLevel(item: FeedbackItem, keyword: string): string {
  const phrase = keyword.trim().toLowerCase();
  const words = phrase.split(/\s+/).filter(Boolean);

  const title = item.title ?? '';
  const description = item.description ?? '';
  const tagsText = Array.isArray(item.tags) ? item.tags.join(' ') : '';

  const containsPhrase = (text?: string | null) =>
    Boolean(text && phrase && text.toLowerCase().includes(phrase));

  const containsAllWords = (text?: string | null) => {
    if (!text || words.length === 0) return false;
    const lower = text.toLowerCase();
    return words.every((word) => lower.includes(word));
  };

  const containsAnyWord = (text?: string | null) => {
    if (!text || words.length === 0) return false;
    const lower = text.toLowerCase();
    return words.some((word) => lower.includes(word));
  };

  if (containsPhrase(title)) return 'A';
  if (containsAllWords(title)) return 'B';
  if (containsPhrase(tagsText) || containsAllWords(tagsText)) return 'C';
  if (containsPhrase(description) || containsAllWords(description)) return 'D';
  if (containsAnyWord(title) || containsAnyWord(tagsText) || containsAnyWord(description)) return 'E';
  return 'F';
}

function getMatchPriority(matchLevel?: string | null): number {
  switch ((matchLevel ?? '').toUpperCase()) {
    case 'A':
      return 1;
    case 'B':
      return 2;
    case 'C':
      return 3;
    case 'D':
      return 4;
    case 'E':
      return 5;
    default:
      return 99;
  }
}
