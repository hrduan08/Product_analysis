import { resolveProvider } from '../providers/index.js';
import { upsertFeedbackItems, upsertUserFeedbackItems } from '../services/feedback-store.js';
import { YoutubeRateLimitError } from '../services/youtube/quota-manager.js';
import type { FeedbackItem, Platform } from '../types/search.js';

type SyncStat = {
  keyword: string;
  platform: Platform;
  fetched: number;
  created: number;
  updated: number;
  userCreated?: number;
  userUpdated?: number;
  userCreatedIds?: string[];
  userProcessedIds?: string[];
  success: boolean;
  error?: string;
};

export type KeywordSyncResult = {
  stats: SyncStat[];
  created: number;
  updated: number;
  userCreated: number;
  userUpdated: number;
  userCreatedIds: string[];
  userProcessedIds: string[];
  startedAt: Date;
  finishedAt: Date;
};

export type KeywordSyncOptions = {
  keywords: readonly string[];
  platforms: readonly Platform[];
  fetchLimit?: number;
  logLabel?: string;
  userId?: string;
  relevanceLanguage?: string;
  regionCode?: string;
  order?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  maxPages?: number;
};

export async function runKeywordSync(options: KeywordSyncOptions): Promise<KeywordSyncResult> {
  const keywords = [...options.keywords];
  const platforms = [...options.platforms];
  const fetchLimit = options.fetchLimit ?? 50;
  const logLabel = options.logLabel ?? '[sync]';

  const startedAt = new Date();
  console.log(`${logLabel} 开始执行：关键词=${keywords.join(', ') || '-'}, 平台=${platforms.join(', ') || '-'}`);

  const stats: SyncStat[] = [];
  let userCreatedTotal = 0;
  let userUpdatedTotal = 0;
  const userCreatedIds: string[] = [];
  const userProcessedIds: string[] = [];

  if (keywords.length === 0 || platforms.length === 0) {
    const finishedAt = new Date();
    return {
      stats,
      created: 0,
      updated: 0,
      userCreated: 0,
      userUpdated: 0,
      userCreatedIds: [],
      userProcessedIds: [],
      startedAt,
      finishedAt
    };
  }

  for (const keyword of keywords) {
    for (const platform of platforms) {
      const stat = await processKeywordPlatform({
        keyword,
        platform,
        fetchLimit,
        logLabel,
        userId: options.userId,
        relevanceLanguage: options.relevanceLanguage,
        regionCode: options.regionCode,
        order: options.order,
        publishedAfter: options.publishedAfter,
        publishedBefore: options.publishedBefore,
        maxPages: options.maxPages
      });
      stats.push(stat);

      if (stat.userCreated) {
        userCreatedTotal += stat.userCreated;
      }
      if (stat.userUpdated) {
        userUpdatedTotal += stat.userUpdated;
      }
      if (stat.userCreatedIds?.length) {
        userCreatedIds.push(...stat.userCreatedIds);
      }
      if (stat.userProcessedIds?.length) {
        userProcessedIds.push(...stat.userProcessedIds);
      }
    }
  }

  const finishedAt = new Date();
  const duration = finishedAt.getTime() - startedAt.getTime();
  const created = stats.reduce((acc, item) => acc + item.created, 0);
  const updated = stats.reduce((acc, item) => acc + item.updated, 0);

  console.log(`${logLabel} 本次任务完成：耗时 ${duration}ms，新增 ${created} 条，更新 ${updated} 条`);

  return {
    stats,
    created,
    updated,
    userCreated: userCreatedTotal,
    userUpdated: userUpdatedTotal,
    userCreatedIds,
    userProcessedIds,
    startedAt,
    finishedAt
  };
}

async function processKeywordPlatform(params: {
  keyword: string;
  platform: Platform;
  fetchLimit: number;
  logLabel: string;
  userId?: string;
  relevanceLanguage?: string;
  regionCode?: string;
  order?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  maxPages?: number;
}): Promise<SyncStat> {
  try {
    const provider = resolveProvider(params.platform);
    const result = await provider.search({
      query: params.keyword,
      limit: params.fetchLimit,
      relevanceLanguage: params.relevanceLanguage,
      regionCode: params.regionCode,
      order: params.order,
      publishedAfter: params.publishedAfter,
      publishedBefore: params.publishedBefore,
      maxPages: params.maxPages
    });

    const annotatedItems = annotateMatchLevel(result.items, params.keyword);
    const persistResult = await upsertFeedbackItems(params.platform, params.keyword, annotatedItems);

    let userCreated = 0;
    let userUpdated = 0;
    let userCreatedIds: string[] = [];
    let userProcessedIds: string[] = [];

    if (params.userId) {
      const userResult = await upsertUserFeedbackItems(
        params.userId,
        persistResult.processedItems.map((item) => ({
          feedbackItemId: item.id,
          seenAt: item.seenAt
        }))
      );
      userCreated = userResult.created;
      userUpdated = userResult.updated;
      userCreatedIds = userResult.createdIds;
      userProcessedIds = userResult.processedIds;
    }

    console.log(
      `${params.logLabel} ${params.platform}/${params.keyword} → 抓取 ${result.items.length} 条，新增 ${persistResult.created} 条${
        params.userId ? `，用户新增 ${userCreated} 条` : ''
      }`
    );

    return {
      keyword: params.keyword,
      platform: params.platform,
      fetched: result.items.length,
      created: persistResult.created,
      updated: persistResult.updated,
      userCreated: userCreated || undefined,
      userUpdated: userUpdated || undefined,
      userCreatedIds: userCreatedIds.length > 0 ? userCreatedIds : undefined,
      userProcessedIds: userProcessedIds.length > 0 ? userProcessedIds : undefined,
      success: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${params.logLabel} ${params.platform}/${params.keyword} 执行失败：`, message);
    if (error instanceof YoutubeRateLimitError) {
      throw error;
    }
    return {
      keyword: params.keyword,
      platform: params.platform,
      fetched: 0,
      created: 0,
      updated: 0,
      userCreated: 0,
      userUpdated: 0,
      success: false,
      error: message
    };
  }
}

function annotateMatchLevel(items: FeedbackItem[], keyword: string): FeedbackItem[] {
  const phrase = keyword.trim().toLowerCase();
  const words = phrase.split(/\s+/).filter(Boolean);

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

  const getMatchLevel = (item: FeedbackItem): string => {
    const title = item.title ?? '';
    const description = item.description ?? '';
    const tagsText = Array.isArray(item.tags) ? item.tags.join(' ') : '';

    if (containsPhrase(title)) return 'A';
    if (containsAllWords(title)) return 'B';
    if (containsPhrase(tagsText) || containsAllWords(tagsText)) return 'C';
    if (containsPhrase(description) || containsAllWords(description)) return 'D';
    if (containsAnyWord(title) || containsAnyWord(tagsText) || containsAnyWord(description)) return 'E';
    return 'F';
  };

  return items.map((item) => ({
    ...item,
    matchLevel: getMatchLevel(item)
  }));
}
