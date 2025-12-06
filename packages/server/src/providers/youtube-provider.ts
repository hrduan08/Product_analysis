import type { FeedbackItem, SearchParams, SearchProvider, SearchResult } from '../types/search.js';
import { youtubeQuotaManager, YoutubeRateLimitError } from '../services/youtube/quota-manager.js';
import { youtubeConfig } from '../config/youtube.js';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YoutubeProvider implements SearchProvider {
  async search({ query, cursor, limit }: SearchParams): Promise<SearchResult> {
    const resolvedLimit = Math.min(limit ?? youtubeConfig.maxResults, youtubeConfig.maxResults);
    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      order: 'date',
      maxResults: String(resolvedLimit),
      q: query
    });

    if (cursor) {
      searchParams.append('pageToken', cursor);
    }

    const searchData = await requestYoutube<any>('search', 'search', searchParams, {
      hashKey: query
    });

    const videoIds: string[] = (searchData.items ?? [])
      .map((item: any) => item?.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return {
        items: [],
        pageInfo: {
          totalResults: Number(searchData.pageInfo?.totalResults ?? 0) || undefined,
          resultsPerPage: Number(searchData.pageInfo?.resultsPerPage ?? 0) || undefined,
          nextCursor: searchData.nextPageToken ?? null,
          prevCursor: searchData.prevPageToken ?? null,
          raw: {
            nextPageToken: searchData.nextPageToken ?? null,
            prevPageToken: searchData.prevPageToken ?? null
          }
        }
      };
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
    const items: FeedbackItem[] = detailItems.map((video: any) => ({
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
      labels: [String(video.snippet?.channelTitle ?? '')].filter(Boolean)
    }));

    return {
      items,
      pageInfo: {
        totalResults: Number(searchData.pageInfo?.totalResults ?? items.length) || undefined,
        resultsPerPage: Number(searchData.pageInfo?.resultsPerPage ?? items.length) || undefined,
        nextCursor: searchData.nextPageToken ?? null,
        prevCursor: searchData.prevPageToken ?? null,
        raw: {
          nextPageToken: searchData.nextPageToken ?? null,
          prevPageToken: searchData.prevPageToken ?? null
        }
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
