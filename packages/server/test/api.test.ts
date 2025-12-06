import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import nock from 'nock';

import app from '../src/app.js';
import { RedditTokenManager } from '../src/auth/reddit-token-manager.js';

describe('/api/search', () => {
  beforeAll(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    process.env.REDDIT_CLIENT_ID = 'id';
    process.env.REDDIT_CLIENT_SECRET = 'secret';
    process.env.REDDIT_USERNAME = 'user';
    process.env.REDDIT_PASSWORD = 'pass';
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('returns 400 for invalid platform', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({ platform: 'twitter', query: 'Apple' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PLATFORM');
  });

  it('returns YouTube results', async () => {
    nock('https://www.googleapis.com')
      .get('/youtube/v3/search')
      .query((query) => query.q === 'Apple')
      .reply(200, {
        items: [{ id: { videoId: 'abc' } }],
        nextPageToken: null,
        pageInfo: { totalResults: 1, resultsPerPage: 1 }
      });

    nock('https://www.googleapis.com')
      .get('/youtube/v3/videos')
      .query((query) => query.id === 'abc')
      .reply(200, {
        items: [
          {
            id: 'abc',
            snippet: {
              title: 'Video',
              channelTitle: 'Channel',
              publishedAt: '2025-01-01T00:00:00Z',
              thumbnails: { medium: { url: 'https://img' } }
            },
            statistics: { viewCount: '10' }
          }
        ]
      });

    const res = await request(app)
      .get('/api/search')
      .query({ platform: 'youtube', query: 'Apple' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe('abc');
  });

  it('returns Reddit results', async () => {
    vi.spyOn(RedditTokenManager.prototype, 'getToken').mockResolvedValue({
      token: 'token',
      userAgent: 'demo'
    });

    nock('https://oauth.reddit.com')
      .get('/search')
      .query((query) => query.q === 'Apple')
      .reply(200, {
        data: {
          after: null,
          before: null,
          children: [
            {
              data: {
                name: 't3_123',
                title: 'Post',
                author: 'user',
                subreddit: 'apple',
                created_utc: Math.floor(Date.now() / 1000),
                url: 'https://reddit.com/r/apple',
                permalink: '/r/apple',
                score: 1,
                thumbnail: 'https://thumb'
              }
            }
          ]
        }
      });

    const res = await request(app)
      .get('/api/search')
      .query({ platform: 'reddit', query: 'Apple' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].platform).toBe('reddit');
  });
});
