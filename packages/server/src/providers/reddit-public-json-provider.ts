import type { FeedbackItem, SearchParams, SearchProvider, SearchResult } from '../types/search.js';

const API_BASE = 'https://www.reddit.com';
const SUBREDDIT_QUERY_PREFIX = /^subreddit:([A-Za-z0-9_]+)$/i;
const SUBREDDIT_NAME = /^[A-Za-z0-9_]{2,32}$/;
const DEFAULT_USER_AGENT =
  'VoiceInsight/0.1 public-json beta (contact: support@voiceinsight.cloud)';

export class RedditPublicJsonProvider implements SearchProvider {
  async search({ query, cursor, limit = 10, subreddit, timeRange }: SearchParams): Promise<SearchResult> {
    const normalizedSubreddit = subreddit
      ? normalizeSubredditInput(subreddit, { allowPlainName: true })
      : normalizeSubredditInput(query, { allowPlainName: false });
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
    const params = new URLSearchParams({
      raw_json: '1',
      limit: String(safeLimit)
    });

    let endpoint = '/search.json';
    if (normalizedSubreddit) {
      endpoint = `/r/${encodeURIComponent(normalizedSubreddit)}/search.json`;
      params.set('restrict_sr', 'on');
    }
    params.set('q', query);
    params.set('sort', 'comments');
    params.set('t', timeRange ?? 'week');
    params.set('type', 'link');

    if (cursor && cursor.trim().length > 0) {
      params.set('after', cursor);
    }

    const response = await fetch(`${API_BASE}${endpoint}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': process.env.REDDIT_PUBLIC_JSON_USER_AGENT || process.env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT
      }
    });

    if (!response.ok) {
      let message = 'Reddit public JSON 请求失败';
      let payload: unknown = null;
      try {
        payload = await response.json();
        if (payload && typeof payload === 'object' && 'message' in payload) {
          message = String((payload as { message?: unknown }).message || message);
        }
      } catch {
        // ignore parse failure
      }
      console.warn('[reddit-public-json] request failed', {
        status: response.status,
        statusText: response.statusText,
        body: payload
      });
      const error = new Error(message) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as any;
    const children: any[] = data?.data?.children ?? [];
    const now = new Date().toISOString();
    const sourceKeyword = normalizedSubreddit ? `r/${normalizedSubreddit}` : query;

    const items: FeedbackItem[] = children
      .map((child) => child?.data)
      .filter(Boolean)
      .filter((post: any) => post?.name && post?.title)
      .map((post: any) => {
        const permalink = post.permalink ? `https://www.reddit.com${post.permalink}` : null;
        const createdUtc = Number(post.created_utc) * 1000;
        const thumbnail = sanitizeThumbnail(post.thumbnail);

        return {
          platform: 'reddit' as const,
          keyword: sourceKeyword,
          id: String(post.name),
          title: String(post.title ?? ''),
          author: String(post.author ?? 'unknown'),
          publishedAt: Number.isFinite(createdUtc) ? new Date(createdUtc).toISOString() : now,
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
          before: pageInfo.before ?? null,
          provider: 'public_json'
        }
      }
    };
  }
}

function normalizeSubredditInput(value?: string, options: { allowPlainName?: boolean } = {}): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const prefixMatched = trimmed.match(SUBREDDIT_QUERY_PREFIX);
  if (prefixMatched?.[1]) return prefixMatched[1];

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((item) => item.toLowerCase() === 'r');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // continue raw pattern parse
  }

  const rMatched = trimmed.match(/^r\/([A-Za-z0-9_]+)$/i);
  if (rMatched?.[1]) return rMatched[1];

  if (options.allowPlainName && SUBREDDIT_NAME.test(trimmed)) return trimmed;

  return null;
}

function sanitizeThumbnail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value || value === 'self' || value === 'default' || value === 'nsfw' || value === 'image') {
    return null;
  }
  return value.startsWith('http') ? value : null;
}
