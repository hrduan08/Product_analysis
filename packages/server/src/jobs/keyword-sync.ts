import { resolveProvider } from '../providers/index.js';
import { cronConfig } from '../config/cron.js';
import { upsertFeedbackItems, upsertUserFeedbackItems } from '../services/feedback-store.js';
import type { Platform } from '../types/search.js';
import { YoutubeRateLimitError } from '../services/youtube/quota-manager.js';
import type { FeedbackItem } from '../types/search.js';

type SyncStat = {
  keyword: string;
  platform: Platform;
  fetched: number;
  created: number;
  updated: number;
  userCreated?: number;
  userUpdated?: number;
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

type KeywordSyncOptions = {
  keywords?: readonly string[];
  platforms?: readonly Platform[];
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

export async function runKeywordSync(options?: KeywordSyncOptions): Promise<KeywordSyncResult> {
  const keywords = options?.keywords ? [...options.keywords] : [...cronConfig.keywords];
  const platforms = options?.platforms ? [...options.platforms] : [...cronConfig.platforms];
  const fetchLimit = options?.fetchLimit ?? cronConfig.fetchLimit;
  const logLabel = options?.logLabel ?? '[cron]';
  const userId = options?.userId;
  const relevanceLanguage = options?.relevanceLanguage;
  const regionCode = options?.regionCode;
  const order = options?.order;
  const publishedAfter = options?.publishedAfter;
  const publishedBefore = options?.publishedBefore;
  const maxPages = options?.maxPages;

  const startedAt = new Date();
  console.log(
    `${logLabel} 开始执行：关键词=${keywords.join(', ') || '-'}, 平台=${platforms.join(', ') || '-'}`
  );

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
      startedAt,
      finishedAt
    };
  }

  for (const keyword of keywords) {
    for (const platform of platforms) {
      const stat = await processKeywordPlatform(
        keyword,
        platform,
        fetchLimit,
        logLabel,
        userId,
        relevanceLanguage,
        regionCode,
        order,
        publishedAfter,
        publishedBefore,
        maxPages
      );
      stats.push(stat);
      if (stat.userCreated) userCreatedTotal += stat.userCreated;
      if (stat.userUpdated) userUpdatedTotal += stat.userUpdated;
      if (stat.success && stat.userCreated && stat.userCreated > 0 && stat['userCreatedIds']) {
        userCreatedIds.push(...(stat as unknown as { userCreatedIds?: string[] }).userCreatedIds ?? []);
      }
      if (stat.success && stat['userProcessedIds']) {
        userProcessedIds.push(...(stat as unknown as { userProcessedIds?: string[] }).userProcessedIds ?? []);
      }
    }
  }

  const finishedAt = new Date();
  const duration = finishedAt.getTime() - startedAt.getTime();
  const created = stats.reduce((acc, item) => acc + item.created, 0);
  const updated = stats.reduce((acc, item) => acc + item.updated, 0);

  console.log(
    `${logLabel} 本次任务完成：耗时 ${duration}ms，新增 ${created} 条，更新 ${updated} 条`
  );

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

async function processKeywordPlatform(
  keyword: string,
  platform: Platform,
  fetchLimit: number,
  logLabel: string,
  userId?: string,
  relevanceLanguage?: string,
  regionCode?: string,
  order?: string,
  publishedAfter?: string,
  publishedBefore?: string,
  maxPages?: number
): Promise<SyncStat> {
  try {
    const provider = resolveProvider(platform);
    const result = await provider.search({
      query: keyword,
      limit: fetchLimit,
      relevanceLanguage,
      regionCode,
      order,
      publishedAfter,
      publishedBefore,
      maxPages
    });

    const annotatedItems = annotateMatchLevel(result.items, keyword);

    const persistResult = await upsertFeedbackItems(platform, keyword, annotatedItems);
    let userCreated = 0;
    let userUpdated = 0;
    let userCreatedIds: string[] = [];
    let userProcessedIds: string[] = [];

    if (userId) {
      const userResult = await upsertUserFeedbackItems(
        userId,
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
      `${logLabel} ${platform}/${keyword} → 抓取 ${result.items.length} 条，新增 ${persistResult.created} 条${
        userId ? `，用户新增 ${userCreated} 条` : ''
      }`
    );

    return {
      keyword,
      platform,
      fetched: result.items.length,
      created: persistResult.created,
      updated: persistResult.updated,
      userCreated: userCreated || undefined,
      userUpdated: userUpdated || undefined,
      ...(userCreatedIds.length > 0 ? { userCreatedIds } : {}),
      ...(userProcessedIds.length > 0 ? { userProcessedIds } : {}),
      success: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logLabel} ${platform}/${keyword} 执行失败：`, message);
  if (error instanceof YoutubeRateLimitError) {
    throw error;
  }
  return {
    keyword,
      platform,
      fetched: 0,
      created: 0,
      updated: 0,
      userCreated: 0,
      userUpdated: 0,
      success: false,
    error: message
  };
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
    const tagsText = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';

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
}
