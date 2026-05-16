import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import nock from 'nock';

import { RedditTokenManager } from '../src/auth/reddit-token-manager.js';

let YoutubeProvider: typeof import('../src/providers/youtube-provider.js').YoutubeProvider;
let RedditProvider: typeof import('../src/providers/reddit-provider.js').RedditProvider;
let RedditPublicJsonProvider: typeof import('../src/providers/reddit-public-json-provider.js').RedditPublicJsonProvider;
const youtubeQuotaMock = {
  acquireKey: vi.fn().mockResolvedValue({ apiKey: 'test-key' }),
  markKeyAsExhausted: vi.fn(),
  markKeyAsFrozen: vi.fn()
};

vi.mock('../src/services/youtube/quota-manager.js', () => {
  class MockRateLimitError extends Error {}
  return {
    youtubeQuotaManager: youtubeQuotaMock,
    YoutubeRateLimitError: MockRateLimitError
  };
});

describe('YoutubeProvider', () => {
  beforeAll(async () => {
    process.env.YOUTUBE_API_KEYS = 'test-key';
    ({ YoutubeProvider } = await import('../src/providers/youtube-provider.js'));
  });

  afterEach(() => {
    nock.cleanAll();
    youtubeQuotaMock.acquireKey.mockClear();
    youtubeQuotaMock.markKeyAsExhausted.mockClear();
    youtubeQuotaMock.markKeyAsFrozen.mockClear();
  });

  beforeEach(() => {
    youtubeQuotaMock.acquireKey.mockResolvedValue({ apiKey: 'test-key' });
  });

  it('should map YouTube response to FeedbackItem list', async () => {
    const provider = new YoutubeProvider();

    nock('https://www.googleapis.com')
      .get('/youtube/v3/search')
      .query((query) => query.q === 'Apple')
      .reply(200, {
        items: [{ id: { videoId: 'abc123' } }],
        pageInfo: { totalResults: 1, resultsPerPage: 1 },
        nextPageToken: 'TOKEN123'
      });

    nock('https://www.googleapis.com')
      .get('/youtube/v3/videos')
      .query((query) => query.id === 'abc123')
      .reply(200, {
        items: [
          {
            id: 'abc123',
            snippet: {
              title: 'Video Title',
              channelTitle: 'Channel',
              publishedAt: '2025-01-01T00:00:00Z',
              thumbnails: { medium: { url: 'https://image' } }
            },
            statistics: {
              viewCount: '42'
            }
          }
        ]
      });

    const result = await provider.search({ query: 'Apple' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      platform: 'youtube',
      id: 'abc123',
      title: 'Video Title',
      author: 'Channel',
      thumbnailUrl: 'https://image',
      viewCount: 42
    });
    expect(result.pageInfo.nextCursor).toBe('TOKEN123');
  });
});

describe('RedditProvider', () => {
  let getTokenSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    process.env.REDDIT_CLIENT_ID = 'id';
    process.env.REDDIT_CLIENT_SECRET = 'secret';
    process.env.REDDIT_USERNAME = 'user';
    process.env.REDDIT_PASSWORD = 'pass';
    ({ RedditProvider } = await import('../src/providers/reddit-provider.js'));
    ({ RedditPublicJsonProvider } = await import('../src/providers/reddit-public-json-provider.js'));
  });

  beforeEach(() => {
    getTokenSpy = vi.spyOn(RedditTokenManager.prototype, 'getToken').mockResolvedValue({
      token: 'token-123',
      userAgent: 'demo'
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('maps Reddit posts to FeedbackItem list', async () => {
    const provider = new RedditProvider();
    const createdUtc = Math.floor(Date.now() / 1000);

    nock('https://oauth.reddit.com')
      .get('/search')
      .query((query) => query.q === 'Apple')
      .reply(200, {
        data: {
          after: 't3_after',
          before: null,
          dist: 1,
          children: [
            {
              data: {
                name: 't3_abc',
                title: 'Reddit Post',
                author: 'redditor',
                subreddit: 'apple',
                created_utc: createdUtc,
                url: 'https://reddit.com/r/apple/comments/abc',
                permalink: '/r/apple/comments/abc',
                score: 123,
                thumbnail: 'https://thumb'
              }
            }
          ]
        }
      });

    const result = await provider.search({ query: 'Apple' });

    expect(getTokenSpy).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      platform: 'reddit',
      id: 't3_abc',
      title: 'Reddit Post',
      author: 'redditor',
      score: 123,
      labels: ['apple'],
      thumbnailUrl: 'https://thumb',
      permalink: 'https://www.reddit.com/r/apple/comments/abc'
    });
    expect(result.pageInfo.nextCursor).toBe('t3_after');
  });

  it('clears token cache on 401', async () => {
    const provider = new RedditProvider();
    const clearSpy = vi.spyOn(RedditTokenManager.prototype, 'clear');

    nock('https://oauth.reddit.com').get('/search').query(true).reply(401, {
      message: 'Unauthorized'
    });

    await expect(provider.search({ query: 'Apple' })).rejects.toThrowError();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('maps public JSON Reddit posts to FeedbackItem list', async () => {
    const provider = new RedditPublicJsonProvider();
    const createdUtc = Math.floor(Date.now() / 1000);

    nock('https://www.reddit.com')
      .get('/r/apple/search.json')
      .query((query) =>
        query.limit === '10' &&
        query.raw_json === '1' &&
        query.restrict_sr === 'on' &&
        query.q === 'Apple' &&
        query.sort === 'comments' &&
        query.t === 'week' &&
        query.type === 'link'
      )
      .reply(200, {
        data: {
          after: 't3_after',
          before: null,
          dist: 1,
          children: [
            {
              data: {
                name: 't3_json',
                title: 'Public JSON Post',
                author: 'json_user',
                subreddit: 'apple',
                created_utc: createdUtc,
                url: 'https://reddit.com/r/apple/comments/json',
                permalink: '/r/apple/comments/json',
                score: 7,
                num_comments: 3,
                thumbnail: 'self'
              }
            }
          ]
        }
      });

    const result = await provider.search({ query: 'Apple', subreddit: 'apple' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      platform: 'reddit',
      id: 't3_json',
      title: 'Public JSON Post',
      author: 'json_user',
      score: 7,
      commentCount: 3,
      labels: ['apple'],
      thumbnailUrl: null,
      permalink: 'https://www.reddit.com/r/apple/comments/json'
    });
    expect(result.pageInfo.nextCursor).toBe('t3_after');
  });
});
