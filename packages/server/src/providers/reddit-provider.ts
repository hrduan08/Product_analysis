import type { SearchParams, SearchProvider, SearchResult } from '../types/search.js';
import { RedditTokenManager } from '../auth/reddit-token-manager.js';

const API_BASE = 'https://oauth.reddit.com';
const SUBREDDIT_QUERY_PREFIX = /^subreddit:([A-Za-z0-9_]+)$/i;

export class RedditProvider implements SearchProvider {
  private readonly tokenManager = new RedditTokenManager();

  async search({ query, cursor, limit = 10, subreddit }: SearchParams): Promise<SearchResult> {
    const { token, userAgent } = await this.tokenManager.getToken();
    const normalizedSubreddit = normalizeSubredditInput(subreddit ?? query);

    let endpoint = '/search';
    const params = new URLSearchParams({
      limit: String(limit)
    });

    if (normalizedSubreddit) {
      endpoint = `/r/${normalizedSubreddit}/new`;
    } else {
      params.set('q', query);
      params.set('sort', 'new');
      params.set('type', 'link');
    }

    if (cursor && cursor.trim().length > 0) {
      params.set('after', cursor);
    }

    const response = await fetch(`${API_BASE}${endpoint}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': userAgent
      }
    });

    if (!response.ok) {
      let message = 'Reddit 搜索请求失败';
      let errorPayload: unknown = null;
      try {
        errorPayload = await response.json();
        if (typeof errorPayload === 'object' && errorPayload) {
          const payload = errorPayload as any;
          message = payload?.message ?? message;
          if (payload?.error) {
            message = `${payload.error}: ${payload.error_description ?? message}`;
          }
        }
      } catch {
        // ignore JSON parse error
      }
      console.warn('[reddit] request failed', {
        status: response.status,
        statusText: response.statusText,
        body: errorPayload
      });
      const error = new Error(message) as Error & { status?: number };
      error.status = response.status;
      if (response.status === 401) {
        this.tokenManager.clear();
      }
      throw error;
    }

    const data = (await response.json()) as any;
    const children: any[] = data?.data?.children ?? [];
    const now = new Date().toISOString();

    const sourceKeyword = normalizedSubreddit ? `r/${normalizedSubreddit}` : query;
    const items = children
      .map((child) => child?.data)
      .filter(Boolean)
      .filter((post: any) => post?.name && post?.title)
      .map((post: any) => {
        const permalink: string | null = post.permalink
          ? `https://www.reddit.com${post.permalink}`
          : null;
        const thumbnail = sanitizeThumbnail(post.thumbnail);
        const createdUtc = Number(post.created_utc) * 1000;

        return {
          platform: 'reddit' as const,
          keyword: sourceKeyword,
          id: String(post.name),
          title: String(post.title ?? ''),
          author: String(post.author ?? 'unknown'),
          publishedAt: isFinite(createdUtc) ? new Date(createdUtc).toISOString() : now,
          fetchedAt: now,
          url: typeof post.url === 'string' && post.url ? post.url : permalink ?? '',
          permalink,
          thumbnailUrl: thumbnail,
          viewCount: null,
          score: typeof post.score === 'number' ? post.score : null,
          commentCount: typeof post.num_comments === 'number' ? post.num_comments : null,
          description: typeof post.selftext === 'string' && post.selftext.length > 0 ? post.selftext : null,
          tags: [post.link_flair_text, post.link_flair_richtext?.[0]?.e].filter(
            (item): item is string => typeof item === 'string' && item.length > 0
          ),
          labels: [String(post.subreddit ?? '')].filter(Boolean)
        };
      });

    const pageInfo = data?.data ?? {};

    return {
      items,
      pageInfo: {
        totalResults: typeof pageInfo.dist === 'number' ? pageInfo.dist : undefined,
        resultsPerPage: items.length,
        nextCursor: pageInfo.after ?? null,
        prevCursor: pageInfo.before ?? null,
        raw: {
          after: pageInfo.after ?? null,
          before: pageInfo.before ?? null
        }
      }
    };
  }
}

function normalizeSubredditInput(value?: string): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const prefixMatched = trimmed.match(SUBREDDIT_QUERY_PREFIX);
  if (prefixMatched?.[1]) {
    return prefixMatched[1];
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((item) => item.toLowerCase() === 'r');
    if (idx >= 0 && parts[idx + 1]) {
      return parts[idx + 1];
    }
  } catch {
    // ignore URL parse failure, continue raw pattern parse
  }

  const rMatched = trimmed.match(/^r\/([A-Za-z0-9_]+)$/i);
  if (rMatched?.[1]) {
    return rMatched[1];
  }

  return null;
}

function sanitizeThumbnail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (!value || value === 'self' || value === 'default' || value === 'nsfw' || value === 'image') {
    return null;
  }
  return value.startsWith('http') ? value : null;
}
