import { getEnv } from '../utils/env.js';

type TokenCache = {
  value: string;
  expiresAt: number;
};

const TOKEN_ENDPOINT = 'https://www.reddit.com/api/v1/access_token';

export class RedditTokenManager {
  private cache: TokenCache | null = null;

  private readonly clientId = getEnv('REDDIT_CLIENT_ID');
  private readonly clientSecret = getEnv('REDDIT_CLIENT_SECRET');
  private readonly username = getEnv('REDDIT_USERNAME');
  private readonly password = getEnv('REDDIT_PASSWORD');
  private readonly userAgent =
    process.env.REDDIT_USER_AGENT ?? `ProductInsightDemo/0.1 by ${this.username}`;

  async getToken(): Promise<{ token: string; userAgent: string }> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return { token: this.cache.value, userAgent: this.userAgent };
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'password',
      username: this.username,
      password: this.password
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent
      },
      body
    });

    if (!response.ok) {
      let message = 'Reddit OAuth 请求失败';
      try {
        const payload = (await response.json()) as any;
        message = payload?.error_description ?? payload?.message ?? message;
      } catch {
        // ignore
      }
      const error = new Error(message) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    const expiresAt = Date.now() + Math.max(0, (data.expires_in - 60) * 1000); // 提前 60s 过期

    this.cache = {
      value: data.access_token,
      expiresAt
    };

    return { token: data.access_token, userAgent: this.userAgent };
  }

  clear() {
    this.cache = null;
  }
}
