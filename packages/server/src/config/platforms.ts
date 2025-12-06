import type { Platform } from '../types/search.js';

const REDDIT_ENV_KEYS = [
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
  'REDDIT_USERNAME',
  'REDDIT_PASSWORD'
] as const;

export function isRedditConfigured(): boolean {
  return REDDIT_ENV_KEYS.every((key) => Boolean(process.env[key]));
}

export function getEnabledProviderPlatforms(): Platform[] {
  return isRedditConfigured() ? ['youtube', 'reddit'] : ['youtube'];
}

export function filterEnabledProviderPlatforms(values: readonly string[]): Platform[] {
  const enabled = new Set<Platform>(getEnabledProviderPlatforms());
  return values.filter((value): value is Platform => enabled.has(value as Platform));
}

export function getSelectableSearchPlatforms(): string[] {
  const base = ['youtube', 'x', 'facebook'];
  if (isRedditConfigured()) {
    base.splice(1, 0, 'reddit');
  }
  return base;
}
