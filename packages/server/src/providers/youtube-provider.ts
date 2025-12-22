import type { FeedbackItem, SearchParams, SearchProvider, SearchResult } from '../types/search.js';
import { youtubeQuotaManager, YoutubeRateLimitError } from '../services/youtube/quota-manager.js';
import { youtubeConfig } from '../config/youtube.js';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YoutubeProvider implements SearchProvider {
  async search({
    query,
    cursor,
    limit,
    relevanceLanguage,
    regionCode,
    order,
    publishedAfter,
    publishedBefore,
    maxPages
  }: SearchParams): Promise<SearchResult> {
    const perPageLimit = Math.min(limit ?? youtubeConfig.maxResults, youtubeConfig.maxResults);
    const pages = Math.max(1, Math.min(maxPages ?? 1, 10));
    let pageToken = cursor ?? null;
    const allItems: FeedbackItem[] = [];
    let nextCursor: string | null = null;

    for (let page = 0; page < pages; page += 1) {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        order: order ?? 'relevance',
        maxResults: String(perPageLimit),
        q: query
      });

      if (relevanceLanguage) {
        searchParams.append('relevanceLanguage', relevanceLanguage);
      }
      if (regionCode) {
        searchParams.append('regionCode', regionCode);
      }
      if (publishedAfter) {
        searchParams.append('publishedAfter', publishedAfter);
      }
      if (publishedBefore) {
        searchParams.append('publishedBefore', publishedBefore);
      }
      if (pageToken) {
        searchParams.append('pageToken', pageToken);
      }

      const searchData = await requestYoutube<any>('search', 'search', searchParams, {
        hashKey: query
      });

      const videoIds: string[] = (searchData.items ?? [])
        .map((item: any) => item?.id?.videoId)
        .filter(Boolean);

      if (videoIds.length === 0) {
        nextCursor = searchData.nextPageToken ?? null;
        break;
      }

      const detailParams = new URLSearchParams({
        part: 'snippet,statistics',
        id: videoIds.join(',')
      });

      const detailData = await requestYoutube<any>('videos', 'videos', detailParams, {
        hashKey: query,
        unitsOverride: youtubeConfig.videoUnitsPerCall,
        calls: 1
      });

      const now = new Date().toISOString();
      const detailItems: any[] = Array.isArray(detailData.items) ? detailData.items : [];
      const pageItems: FeedbackItem[] = detailItems.map((video: any) => ({
        platform: 'youtube',
        keyword: query,
        id: String(video.id),
        title: String(video.snippet?.title ?? ''),
        author: String(video.snippet?.channelTitle ?? ''),
        publishedAt: String(video.snippet?.publishedAt ?? ''),
        fetchedAt: now,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        permalink: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnailUrl: String(video.snippet?.thumbnails?.medium?.url ?? ''),
        viewCount: Number(video.statistics?.viewCount ?? 0),
        score: null,
        commentCount: video.statistics?.commentCount ? Number(video.statistics.commentCount) : null,
        description: video.snippet?.description ? String(video.snippet.description) : null,
        tags: Array.isArray(video.snippet?.tags) ? video.snippet.tags.map((tag: any) => String(tag)) : undefined,
        labels: [String(video.snippet?.channelTitle ?? '')].filter(Boolean)
      }));

      allItems.push(...pageItems);

      nextCursor = searchData.nextPageToken ?? null;
      if (!nextCursor) {
        break;
      }
      pageToken = nextCursor;
    }

    return {
      items: allItems,
      pageInfo: {
        totalResults: undefined,
        resultsPerPage: allItems.length,
        nextCursor
      }
    };
  }
}

type RequestOptions = {
  hashKey?: string;
  unitsOverride?: number;
  calls?: number;
};

async function requestYoutube<T>(
  kind: 'search' | 'videos',
  endpoint: string,
  params: URLSearchParams,
  options?: RequestOptions
): Promise<T> {
  const { apiKey } = await youtubeQuotaManager.acquireKey(kind, {
    hashKey: options?.hashKey,
    units: options?.unitsOverride,
    calls: options?.calls
  });
  params.set('key', apiKey);
  const response = await fetch(`${API_BASE}/${endpoint}?${params.toString()}`);
  await handleError(response, kind, apiKey);
  return (await response.json()) as T;
}

async function handleError(response: Response, kind: 'search' | 'videos', apiKey: string): Promise<void> {
  if (response.ok) {
    return;
  }
  let message = 'YouTube API 请求失败';
  let reason: string | undefined;

  try {
    const payload = (await response.json()) as any;
    message = payload?.error?.message ?? message;
    reason = payload?.error?.errors?.[0]?.reason ?? payload?.error?.status;
  } catch {
    // ignore
  }

  if (reason && DAILY_LIMIT_REASONS.has(reason)) {
    await youtubeQuotaManager.markKeyAsExhausted(apiKey);
    throw new YoutubeRateLimitError('YouTube 日配额已用尽');
  }
  if (reason && PER_MINUTE_LIMIT_REASONS.has(reason)) {
    await youtubeQuotaManager.markKeyAsFrozen(apiKey, 60_000);
    throw new YoutubeRateLimitError('YouTube API 调用过于频繁，请稍后再试', 60);
  }

  const error = new Error(message) as Error & { status?: number };
  error.status = response.status;
  throw error;
}

const DAILY_LIMIT_REASONS = new Set(['dailyLimitExceeded', 'quotaExceeded', 'usageLimits']);
const PER_MINUTE_LIMIT_REASONS = new Set(['rateLimitExceeded', 'userRateLimitExceeded']);
