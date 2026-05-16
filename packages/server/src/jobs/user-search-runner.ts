import { formatISO } from 'date-fns';

import { mailConfig } from '../config/mail.js';
import { userSearchFetchConfig } from '../config/user-search-fetch.js';
import {
  getUserFeedbackItemsByIds,
  listUserUnnotifiedFeedback,
  markUserFeedbackItemsNotified,
  updateUserFeedbackFilterResults,
  type FeedbackEntity,
  upsertFeedbackItems,
  upsertUserFeedbackItems
} from '../services/feedback-store.js';
import {
  computeNextAutoRunAt,
  getSupportedProviderPlatformsForUser,
  listDueUserSearchConfigs,
  resolveRedditCommunityName,
  USER_SEARCH_REDDIT_INTERVAL_MS,
  USER_SEARCH_YOUTUBE_INTERVAL_MS,
  updateExecutionMetadata,
  updateFeishuChannelStatus
} from '../services/search-config.js';
import { buildMailContent } from '../services/mail/composer.js';
import { sendMail } from '../services/mail/sender.js';
import { recordNotifyJob } from '../services/notify-jobs.js';
import { notifyAlert } from '../services/alert/notifier.js';
import { getTierLimitsByStatus } from '../config/search-limits.js';
import type { Prisma } from '../generated/prisma/client.js';
import { YoutubeRateLimitError } from '../services/youtube/quota-manager.js';
import { sendFeishuWebhookMessage, type FeishuWebhookPayload } from '../services/feishu.js';
import {
  buildProductProfileSummary,
  hasUsableProductProfile,
  rerankCandidatesAgainstProfile,
  type ProductProfile
} from '../services/product-profile.js';
import { resolveProvider } from '../providers/index.js';
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
const MAX_TOTAL_PUSH_ITEMS = 4;
const OBSERVATION_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RERANK_CANDIDATES_PER_PLATFORM = 20;
const RERANK_PASS_SCORE = Number(process.env.PRODUCT_PROFILE_RERANK_THRESHOLD ?? '0.08');

type SelectedFeedbackEntity = FeedbackEntity & {
  matchedKeywords: string[];
};

export async function runUserSearchConfigJobs(
  now: Date = new Date(),
  options: { ignoreNextRunAt?: boolean } = {}
): Promise<UserSearchJobResult> {
  const configs = await listDueUserSearchConfigs(now, {
    ignoreNextRunAt: options.ignoreNextRunAt
  });

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

    const activePlatforms = getSupportedProviderPlatformsForUser(config.platforms, config.user.email);
    const redditCommunities = clampToLimit(config.reddit_communities, tierLimits.maxRedditCommunities);
    const redditKeywords = clampToLimit(config.reddit_keywords, tierLimits.maxRedditKeywords);
    const youtubeKeywords = clampToLimit(config.youtube_keywords, tierLimits.maxYoutubeKeywords);

    const hasRedditTarget =
      activePlatforms.includes('reddit') && redditCommunities.length > 0 && redditKeywords.length > 0;
    const hasYoutubeTarget = activePlatforms.includes('youtube') && youtubeKeywords.length > 0;

    if (!hasRedditTarget && !hasYoutubeTarget) {
      skipped += 1;
      const nextRun = computeNextAutoRunAt({
        platforms: activePlatforms,
        redditCommunities,
        redditKeywords,
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
        configUpdatedAt: config.updated_at,
        logLabel,
        now,
        productProfile: {
          brand: config.product_profile_brand ?? '',
          productName: config.product_profile_product_name ?? '',
          category: config.product_profile_category ?? '',
          coreFeatures: config.product_profile_core_features ?? []
        },
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
        redditKeywords,
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
            rawCandidates: selection.rawCandidateCount,
            prefilterCandidates: selection.prefilterCandidateCount,
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
  items: SelectedFeedbackEntity[];
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
    const limitedItems = input.items;
    limitedItems.forEach((item, index) => {
      const metric = formatMetricForFeishu(item) ?? '-';
      const published = item.published_at ?? item.first_seen_at ?? null;
      const publishedText = published ? FEISHU_DATE_FORMATTER.format(published) : '未知';
      const keywordLabel =
        item.matchedKeywords.length > 0
          ? item.matchedKeywords.map(escapeFeishuMarkdown).join(', ')
          : item.keyword
            ? escapeFeishuMarkdown(item.keyword)
            : '-';
      const author = item.author ? escapeFeishuMarkdown(item.author) : '-';
      const targetUrl = item.platform === 'reddit' ? item.permalink || item.url : item.url;

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
            elements: [{ tag: 'markdown', content: `**关键词：** ${keywordLabel}` }]
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

      if (targetUrl) {
        elements.push({
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看内容' },
              url: targetUrl,
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
  selectedItems: SelectedFeedbackEntity[];
  candidateCount: number;
  rawCandidateCount: number;
  prefilterCandidateCount: number;
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
  configUpdatedAt: Date;
  logLabel: string;
  now: Date;
  productProfile: ProductProfile;
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
    params.redditKeywords.length > 0 &&
    isPlatformDue(params.redditLastRunAt, USER_SEARCH_REDDIT_INTERVAL_MS, params.now, params.configUpdatedAt);

  if (shouldRunReddit) {
    const redditRun = await runRedditCommunitySearch({
      userId: params.userId,
      communities: params.redditCommunities,
      keywords: params.redditKeywords,
      fetchLimit: userSearchFetchConfig.redditFetchLimit,
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
    isPlatformDue(params.youtubeLastRunAt, USER_SEARCH_YOUTUBE_INTERVAL_MS, params.now, params.configUpdatedAt);

  if (shouldRunYoutube) {
    const youtubeResult = await runYoutubeKeywordSearch({
      userId: params.userId,
      keywords: params.youtubeKeywords,
      fetchLimit: userSearchFetchConfig.youtubeFetchLimit,
      logLabel: `${params.logLabel}[youtube]`,
      relevanceLanguage: params.langRegion?.relevanceLanguage,
      regionCode: params.langRegion?.regionCode,
      now: params.now
    });

    totalCreated += youtubeResult.created;
    totalUpdated += youtubeResult.updated;
    userCreated += youtubeResult.userCreated;
    userUpdated += youtubeResult.userUpdated;
    successCount += youtubeResult.successCount;
    failCount += youtubeResult.failCount;
    finishedAt = youtubeResult.finishedAt;
    youtubeLastRunAt = youtubeResult.finishedAt;
    for (const id of youtubeResult.userProcessedIds) {
      processedIds.add(id);
    }
  }

  const processedRecords = await getUserFeedbackItemsByIds(params.userId, Array.from(processedIds));

  const backlogSince = new Date(params.now.getTime() - OBSERVATION_WINDOW_DAYS * DAY_MS);
  const seenSince =
    params.configUpdatedAt.getTime() > backlogSince.getTime() ? params.configUpdatedAt : backlogSince;
  const backlogRecords = await listUserUnnotifiedFeedback({
    userId: params.userId,
    platforms: params.activePlatforms,
    since: backlogSince,
    seenSince,
    limit: 500
  });

  const allCandidateMap = new Map<string, SelectedFeedbackEntity>();
  const communitySet = new Set(
    params.redditCommunities
      .map((item) => resolveRedditCommunityName(item)?.toLowerCase())
      .filter((item): item is string => Boolean(item))
  );

  for (const record of [...processedRecords, ...backlogRecords]) {
    if (record.last_notified_at) {
      continue;
    }
    if (!isRelevantCandidate(record, {
      communitySet,
      now: params.now
    })) {
      continue;
    }
    const existing = allCandidateMap.get(record.feedback.id);
    const matchedKeywords = dedupeKeywords(
      record.matched_keywords.length > 0 ? record.matched_keywords : [record.feedback.keyword]
    );
    if (!existing) {
      allCandidateMap.set(record.feedback.id, {
        ...record.feedback,
        matchedKeywords
      });
      continue;
    }

    allCandidateMap.set(record.feedback.id, {
      ...(preferNewerFeedback(existing, record.feedback)),
      matchedKeywords: dedupeKeywords([...existing.matchedKeywords, ...matchedKeywords])
    });
  }

  const allCandidates = Array.from(allCandidateMap.values());
  const filteredCandidates = await applyProductProfileFiltering({
    userId: params.userId,
    logLabel: params.logLabel,
    productProfile: params.productProfile,
    targetKeywords: dedupeKeywords([...params.youtubeKeywords, ...params.redditKeywords]),
    candidates: allCandidates
  });
  const youtubeCandidates = filteredCandidates.passed.filter((item) => item.platform === 'youtube');
  const redditCandidates = filteredCandidates.passed.filter((item) => item.platform === 'reddit');

  const selectedYoutube = sortPlatformCandidates(youtubeCandidates);
  const selectedReddit = sortPlatformCandidates(redditCandidates);
  const selectedItems = interleavePlatformCandidates(selectedYoutube, selectedReddit, MAX_TOTAL_PUSH_ITEMS);

  return {
    selectedItems,
    totalCreated,
    totalUpdated,
    userCreated,
    userUpdated,
    startedAt,
    finishedAt,
    candidateCount: filteredCandidates.passed.length,
    rawCandidateCount: allCandidates.length,
    prefilterCandidateCount: filteredCandidates.prefiltered.length,
    successCount,
    failCount,
    redditLastRunAt,
    youtubeLastRunAt
  };
}

async function applyProductProfileFiltering(params: {
  userId: string;
  logLabel: string;
  productProfile: ProductProfile;
  targetKeywords: string[];
  candidates: SelectedFeedbackEntity[];
}): Promise<{
  passed: SelectedFeedbackEntity[];
  prefiltered: SelectedFeedbackEntity[];
}> {
  if (params.candidates.length === 0) {
    return { passed: [], prefiltered: [] };
  }

  if (!hasUsableProductProfile(params.productProfile)) {
    await updateUserFeedbackFilterResults(
      params.userId,
      params.candidates.map((candidate) => ({
        feedbackItemId: candidate.id,
        status: 'passed_no_profile',
        score: null,
        reason: 'missing_product_profile'
      }))
    );
    return {
      passed: params.candidates,
      prefiltered: params.candidates
    };
  }

  const prefiltered = params.candidates.filter((candidate) =>
    passesProfilePreFilter(candidate, params.productProfile, params.targetKeywords)
  );
  const prefilteredIds = new Set(prefiltered.map((candidate) => candidate.id));
  const rejectedByRule = params.candidates.filter((candidate) => !prefilteredIds.has(candidate.id));

  if (rejectedByRule.length > 0) {
    await updateUserFeedbackFilterResults(
      params.userId,
      rejectedByRule.map((candidate) => ({
        feedbackItemId: candidate.id,
        status: 'rejected_pre_filter',
        score: null,
        reason: 'no_profile_signals'
      }))
    );
  }

  const limitedCandidates = [
    ...sortPlatformCandidates(prefiltered.filter((candidate) => candidate.platform === 'youtube')).slice(
      0,
      MAX_RERANK_CANDIDATES_PER_PLATFORM
    ),
    ...sortPlatformCandidates(prefiltered.filter((candidate) => candidate.platform === 'reddit')).slice(
      0,
      MAX_RERANK_CANDIDATES_PER_PLATFORM
    )
  ];

  if (limitedCandidates.length === 0) {
    return { passed: [], prefiltered };
  }

  try {
    const rerankResults = await rerankCandidatesAgainstProfile({
      profile: params.productProfile,
      targetKeywords: params.targetKeywords,
      candidates: limitedCandidates.map((candidate) => ({
        id: candidate.id,
        text: buildCandidateSemanticText(candidate)
      }))
    });

    const scores = new Map(rerankResults.map((item) => [item.id, item.score]));
    const passed = limitedCandidates.filter((candidate) => (scores.get(candidate.id) ?? 0) >= RERANK_PASS_SCORE);
    const failed = limitedCandidates.filter((candidate) => !passed.some((item) => item.id === candidate.id));

    await updateUserFeedbackFilterResults(params.userId, [
      ...passed.map((candidate) => ({
        feedbackItemId: candidate.id,
        status: 'passed_reranker',
        score: scores.get(candidate.id) ?? null,
        reason: 'reranker_pass'
      })),
      ...failed.map((candidate) => ({
        feedbackItemId: candidate.id,
        status: 'rejected_reranker',
        score: scores.get(candidate.id) ?? null,
        reason: 'reranker_below_threshold'
      }))
    ]);

    console.log(
      `${params.logLabel}[profile] 原始 ${params.candidates.length} 条，预过滤 ${prefiltered.length} 条，送入 reranker ${limitedCandidates.length} 条，通过 ${passed.length} 条`
    );

    return { passed, prefiltered };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${params.logLabel}[profile] reranker 过滤失败，回退到预过滤结果：${message}`);
    await updateUserFeedbackFilterResults(
      params.userId,
      limitedCandidates.map((candidate) => ({
        feedbackItemId: candidate.id,
        status: 'passed_reranker_fallback',
        score: null,
        reason: 'reranker_error'
      }))
    );
    return { passed: limitedCandidates, prefiltered };
  }
}

function sortPlatformCandidates(items: SelectedFeedbackEntity[]): SelectedFeedbackEntity[] {
  return [...items].sort((a, b) => {
    if (a.platform === 'youtube' && b.platform === 'youtube') {
      const viewDiff = (b.view_count ?? 0) - (a.view_count ?? 0);
      if (viewDiff !== 0) return viewDiff;
      const commentDiff = (b.comment_count ?? 0) - (a.comment_count ?? 0);
      if (commentDiff !== 0) return commentDiff;
    }

    if (a.platform === 'reddit' && b.platform === 'reddit') {
      const commentDiff = (b.comment_count ?? 0) - (a.comment_count ?? 0);
      if (commentDiff !== 0) return commentDiff;
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
    }

    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return dateB - dateA;
  });
}

function isRelevantCandidate(
  record: Awaited<ReturnType<typeof getUserFeedbackItemsByIds>>[number],
  options: {
    communitySet: Set<string>;
    now: Date;
  }
): boolean {
  const feedback = record.feedback;
  const ageMs = options.now.getTime() - (feedback.published_at?.getTime() ?? feedback.first_seen_at?.getTime() ?? 0);
  if (feedback.platform === 'youtube') {
    if (ageMs > OBSERVATION_WINDOW_DAYS * DAY_MS) {
      return false;
    }
    return record.matched_keywords.length > 0 || Boolean(feedback.keyword);
  }

  if (feedback.platform === 'reddit') {
    if (ageMs > OBSERVATION_WINDOW_DAYS * DAY_MS) {
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
    return record.matched_keywords.length > 0 || Boolean(feedback.keyword);
  }

  return false;
}

function passesProfilePreFilter(
  item: SelectedFeedbackEntity,
  profile: ProductProfile,
  targetKeywords: string[]
): boolean {
  const text = buildCandidateSemanticText(item);
  if (!text) {
    return false;
  }

  const normalizedText = normalizeSearchText(text);
  const tokenSet = new Set(tokenizeNormalizedText(normalizedText));
  const phrases = dedupeKeywords([
    profile.brand,
    profile.productName,
    ...profile.coreFeatures,
    ...targetKeywords
  ]);

  if (phrases.length === 0) {
    return true;
  }

  for (const phrase of phrases) {
    const normalizedPhrase = normalizeSearchText(phrase);
    if (!normalizedPhrase) continue;
    if (normalizedText.includes(normalizedPhrase)) {
      return true;
    }

    const tokens = tokenizeNormalizedText(normalizedPhrase);
    if (tokens.length >= 2 && tokens.every((token) => tokenSet.has(token))) {
      return true;
    }
  }

  return false;
}

function buildCandidateSemanticText(item: SelectedFeedbackEntity): string {
  const metadata = ((item.metadata ?? {}) as Record<string, unknown>) ?? {};
  const description = typeof metadata.description === 'string' ? metadata.description : '';
  const tags = Array.isArray(metadata.tags) ? metadata.tags.map((value) => String(value)) : [];
  const labels = Array.isArray(metadata.labels) ? metadata.labels.map((value) => String(value)) : [];

  return [
    item.title,
    description,
    tags.join(' '),
    labels.join(' '),
    item.author ?? '',
    item.platform === 'reddit' ? item.permalink ?? '' : ''
  ]
    .filter(Boolean)
    .join('\n');
}


type PlatformSyncResult = {
  created: number;
  updated: number;
  userCreated: number;
  userUpdated: number;
  userProcessedIds: string[];
  successCount: number;
  failCount: number;
  finishedAt: Date;
};

async function runRedditCommunitySearch(params: {
  userId: string;
  communities: string[];
  keywords: string[];
  fetchLimit: number;
  logLabel: string;
}): Promise<PlatformSyncResult> {
  let created = 0;
  let updated = 0;
  let userCreated = 0;
  let userUpdated = 0;
  const userProcessedIds: string[] = [];
  let successCount = 0;
  let failCount = 0;
  let finishedAt = new Date();
  const query = buildCombinedKeywordQuery(params.keywords);

  for (const source of params.communities) {
    const subreddit = resolveRedditCommunityName(source);
    if (!subreddit) {
      failCount += 1;
      console.warn(`${params.logLabel} 无法识别社区来源：${source}`);
      continue;
    }

    try {
      const redditProvider = resolveProvider('reddit');
      const result = await redditProvider.search({
        query,
        subreddit,
        limit: params.fetchLimit,
        timeRange: 'week'
      });

      const attributedItems = attributeMatchedKeywordsForDisplay(result.items, params.keywords);
      if (attributedItems.length === 0) {
        successCount += 1;
        continue;
      }

      const groups = groupByKeyword(attributedItems);
      for (const [keyword, items] of groups.entries()) {
        const persist = await upsertFeedbackItems('reddit', keyword, items);
        created += persist.created;
        updated += persist.updated;

        const userResult = await upsertUserFeedbackItems(
          params.userId,
          persist.processedItems.map((item, index) => ({
            feedbackItemId: item.id,
            seenAt: item.seenAt,
            matchedKeywords: items[index]?.matchedKeywords ?? []
          }))
        );

        userCreated += userResult.created;
        userUpdated += userResult.updated;
        userProcessedIds.push(...userResult.processedIds);
      }

      successCount += 1;
      finishedAt = new Date();
      console.log(`${params.logLabel} 社区 r/${subreddit} 抓取 ${result.items.length} 条，入池 ${attributedItems.length} 条`);
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

async function runYoutubeKeywordSearch(params: {
  userId: string;
  keywords: string[];
  fetchLimit: number;
  logLabel: string;
  relevanceLanguage?: string;
  regionCode?: string;
  now: Date;
}): Promise<PlatformSyncResult> {
  let created = 0;
  let updated = 0;
  let userCreated = 0;
  let userUpdated = 0;
  let successCount = 0;
  let failCount = 0;
  const userProcessedIds: string[] = [];
  let finishedAt = new Date();

  const youtubeProvider = resolveProvider('youtube');
  const query = buildCombinedKeywordQuery(params.keywords);

  try {
    const result = await youtubeProvider.search({
      query,
      limit: params.fetchLimit,
      relevanceLanguage: params.relevanceLanguage,
      regionCode: params.regionCode,
      order: 'viewCount',
      publishedAfter: new Date(params.now.getTime() - OBSERVATION_WINDOW_DAYS * DAY_MS).toISOString(),
      maxPages: 1
    });

    const attributedItems = attributeMatchedKeywordsForDisplay(result.items, params.keywords);
    const groups = groupByKeyword(attributedItems);

    for (const [keyword, items] of groups.entries()) {
      const persist = await upsertFeedbackItems('youtube', keyword, items);
      created += persist.created;
      updated += persist.updated;

      const userResult = await upsertUserFeedbackItems(
        params.userId,
        persist.processedItems.map((item, index) => ({
          feedbackItemId: item.id,
          seenAt: item.seenAt,
          matchedKeywords: items[index]?.matchedKeywords ?? []
        }))
      );

      userCreated += userResult.created;
      userUpdated += userResult.updated;
      userProcessedIds.push(...userResult.processedIds);
    }

    successCount += 1;
    finishedAt = new Date();
    console.log(`${params.logLabel} 抓取 ${result.items.length} 条，入池 ${attributedItems.length} 条`);
  } catch (error) {
    failCount += 1;
    if (error instanceof YoutubeRateLimitError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${params.logLabel} 执行失败：${message}`);
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

function attributeMatchedKeywordsForDisplay(items: FeedbackItem[], keywords: string[]): FeedbackItem[] {
  if (keywords.length === 0) {
    return items;
  }

  return items.map((item) => {
    const matchedKeywords = resolveMatchedKeywords(item, keywords);
    const primaryKeyword = matchedKeywords[0] ?? keywords[0] ?? item.keyword;
    return {
      ...item,
      keyword: primaryKeyword,
      matchedKeywords
    };
  });
}

function resolveMatchedKeywords(item: FeedbackItem, keywords: string[]): string[] {
  const textTargets = [item.title ?? '', item.description ?? '', ...(item.tags ?? [])]
    .map(normalizeSearchText)
    .filter(Boolean);

  const matched = keywords.filter((keyword) => {
    const normalizedKeyword = normalizeSearchText(keyword);
    if (!normalizedKeyword) {
      return false;
    }
    return textTargets.some((text) => text.includes(normalizedKeyword));
  });

  return matched.length > 0 ? dedupeKeywords(matched) : [];
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/([a-z])(\d)/gi, '$1 $2')
    .replace(/(\d)([a-z])/gi, '$1 $2')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeNormalizedText(value: string): string[] {
  return value.split(' ').filter(Boolean);
}

function containsNormalizedPhrase(text: string, phrase: string): boolean {
  return Boolean(text && phrase && text.includes(phrase));
}

function containsAllTokens(text: string, tokens: string[]): boolean {
  if (!text || tokens.length === 0) {
    return false;
  }
  return tokens.every((token) => containsToken(text, token));
}

function containsAnyToken(text: string, tokens: string[]): boolean {
  if (!text || tokens.length === 0) {
    return false;
  }
  return tokens.some((token) => containsToken(text, token));
}

function containsToken(text: string, token: string): boolean {
  if (!text || !token) {
    return false;
  }
  return tokenizeNormalizedText(text).includes(token);
}

function buildCombinedKeywordQuery(keywords: string[]): string {
  return keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .map((keyword) => `"${keyword.replace(/"/g, '\\"')}"`)
    .join(' OR ');
}

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const keyword of keywords) {
    const trimmed = keyword.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function interleavePlatformCandidates(
  youtubeItems: SelectedFeedbackEntity[],
  redditItems: SelectedFeedbackEntity[],
  limit: number
): SelectedFeedbackEntity[] {
  const merged: SelectedFeedbackEntity[] = [];
  let index = 0;

  while (merged.length < limit) {
    const nextYoutube = youtubeItems[index];
    const nextReddit = redditItems[index];
    let pushed = false;

    if (nextYoutube) {
      merged.push(nextYoutube);
      pushed = true;
      if (merged.length >= limit) {
        break;
      }
    }

    if (nextReddit) {
      merged.push(nextReddit);
      pushed = true;
      if (merged.length >= limit) {
        break;
      }
    }

    if (!pushed) {
      break;
    }
    index += 1;
  }

  return merged;
}

function preferNewerFeedback(current: FeedbackEntity, incoming: FeedbackEntity): FeedbackEntity {
  const currentSeen = current.last_seen_at?.getTime() ?? current.first_seen_at?.getTime() ?? 0;
  const incomingSeen = incoming.last_seen_at?.getTime() ?? incoming.first_seen_at?.getTime() ?? 0;
  return incomingSeen >= currentSeen ? incoming : current;
}

function isPlatformDue(lastRunAt: Date | null, intervalMs: number, now: Date, configUpdatedAt?: Date | null): boolean {
  if (!lastRunAt) {
    return true;
  }
  if (configUpdatedAt && configUpdatedAt.getTime() > lastRunAt.getTime()) {
    return true;
  }
  return now.getTime() - lastRunAt.getTime() >= intervalMs;
}
