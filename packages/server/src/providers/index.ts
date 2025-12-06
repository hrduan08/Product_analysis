import type { Platform, SearchProvider } from '../types/search.js';
import { YoutubeProvider } from './youtube-provider.js';
import { RedditProvider } from './reddit-provider.js';
import { isRedditConfigured } from '../config/platforms.js';

const providers: Partial<Record<Platform, SearchProvider>> = {
  youtube: new YoutubeProvider()
};

if (isRedditConfigured()) {
  providers.reddit = new RedditProvider();
}

export function resolveProvider(platform: Platform): SearchProvider {
  const provider = providers[platform];
  if (!provider) {
    const error = new Error(`暂不支持的平台或尚未启用：${platform}`) as Error & { status?: number };
    error.status = 400;
    throw error;
  }
  return provider;
}
