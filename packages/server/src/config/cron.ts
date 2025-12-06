import type { Platform } from '../types/search.js';
import { getEnabledProviderPlatforms } from './platforms.js';

function parseList(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parsePlatforms(value?: string | null): Platform[] {
  const enabled = getEnabledProviderPlatforms();
  const enabledSet = new Set<Platform>(enabled);
  const all = parseList(value).map((item) => item.toLowerCase());
  const filtered = all.filter((item): item is Platform => enabledSet.has(item as Platform));
  if (filtered.length === 0) {
    return enabled;
  }
  return filtered;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export const cronConfig = {
  enabled: process.env.CRON_ENABLED === 'true',
  schedule: process.env.CRON_SCHEDULE ?? '0 * * * *',
  keywords: parseList(process.env.CRON_KEYWORDS),
  platforms: parsePlatforms(process.env.CRON_PLATFORMS),
  fetchLimit: parsePositiveInt(process.env.CRON_FETCH_LIMIT, 50),
  timezone: process.env.CRON_TIMEZONE,
  runOnStartup: process.env.CRON_RUN_ON_STARTUP !== 'false'
} as const;

export function hasCronTargets(): boolean {
  return cronConfig.keywords.length > 0 && cronConfig.platforms.length > 0;
}
