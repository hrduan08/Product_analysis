import { resolveProvider } from '../providers/index.js';
import { cronConfig } from '../config/cron.js';
import { upsertFeedbackItems } from '../services/feedback-store.js';
import type { Platform } from '../types/search.js';
import { YoutubeRateLimitError } from '../services/youtube/quota-manager.js';

type SyncStat = {
  keyword: string;
  platform: Platform;
  fetched: number;
  created: number;
  updated: number;
  success: boolean;
  error?: string;
};

export type KeywordSyncResult = {
  stats: SyncStat[];
  created: number;
  updated: number;
  startedAt: Date;
  finishedAt: Date;
};

type KeywordSyncOptions = {
  keywords?: readonly string[];
  platforms?: readonly Platform[];
  fetchLimit?: number;
  logLabel?: string;
};

export async function runKeywordSync(options?: KeywordSyncOptions): Promise<KeywordSyncResult> {
  const keywords = options?.keywords ? [...options.keywords] : [...cronConfig.keywords];
  const platforms = options?.platforms ? [...options.platforms] : [...cronConfig.platforms];
  const fetchLimit = options?.fetchLimit ?? cronConfig.fetchLimit;
  const logLabel = options?.logLabel ?? '[cron]';

  const startedAt = new Date();
  console.log(
    `${logLabel} 开始执行：关键词=${keywords.join(', ') || '-'}, 平台=${platforms.join(', ') || '-'}`
  );

  const stats: SyncStat[] = [];

  if (keywords.length === 0 || platforms.length === 0) {
    const finishedAt = new Date();
    return {
      stats,
      created: 0,
      updated: 0,
      startedAt,
      finishedAt
    };
  }

  for (const keyword of keywords) {
    for (const platform of platforms) {
      const stat = await processKeywordPlatform(keyword, platform, fetchLimit, logLabel);
      stats.push(stat);
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
    startedAt,
    finishedAt
  };
}

async function processKeywordPlatform(
  keyword: string,
  platform: Platform,
  fetchLimit: number,
  logLabel: string
): Promise<SyncStat> {
  try {
    const provider = resolveProvider(platform);
    const result = await provider.search({
      query: keyword,
      limit: fetchLimit
    });

    const persistResult = await upsertFeedbackItems(platform, keyword, result.items);

    console.log(
      `${logLabel} ${platform}/${keyword} → 抓取 ${result.items.length} 条，新增 ${persistResult.created} 条`
    );

    return {
      keyword,
      platform,
      fetched: result.items.length,
      created: persistResult.created,
      updated: persistResult.updated,
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
      success: false,
      error: message
    };
  }
}
