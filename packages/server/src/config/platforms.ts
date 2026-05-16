import type { Platform } from '../types/search.js';

const REDDIT_ENV_KEYS = [
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
  'REDDIT_USERNAME',
  'REDDIT_PASSWORD'
] as const;

const DEFAULT_REDDIT_BETA_WHITELIST = [
  '474226642@qq.com',
  'dhrstudy2008@126.com'
] as const;

export type RedditProviderMode = 'oauth' | 'public_json' | 'disabled';

export function isRedditConfigured(): boolean {
  return REDDIT_ENV_KEYS.every((key) => Boolean(process.env[key]));
}

function parseCsv(raw: string | undefined): string[] {
  return String(raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeAccountEmail(raw: string | null | undefined): string {
  return String(raw ?? '').trim().toLowerCase();
}

export function getRedditBetaWhitelist(): string[] {
  const merged = [
    ...DEFAULT_REDDIT_BETA_WHITELIST,
    ...parseCsv(process.env.REDDIT_BETA_WHITELIST)
  ];
  return Array.from(new Set(merged.map(normalizeAccountEmail).filter(Boolean)));
}

export function isRedditBetaUserAllowed(email: string | null | undefined): boolean {
  const normalized = normalizeAccountEmail(email);
  if (!normalized) return false;
  return getRedditBetaWhitelist().includes(normalized);
}

export function getRedditProviderMode(): RedditProviderMode {
  const raw = String(process.env.REDDIT_PROVIDER ?? process.env.REDDIT_DATA_SOURCE ?? 'public_json')
    .trim()
    .toLowerCase();

  if (raw === 'disabled' || raw === 'none' || raw === 'off' || raw === '0') {
    return 'disabled';
  }
  if (raw === 'oauth' || raw === 'api') {
    return isRedditConfigured() ? 'oauth' : 'disabled';
  }
  if (raw === 'json' || raw === 'public_json' || raw === 'public-json') {
    return 'public_json';
  }

  return 'public_json';
}

export function isRedditProviderEnabled(): boolean {
  return getRedditProviderMode() !== 'disabled';
}

function getEnabledProviderPlatforms(): Platform[] {
  return isRedditProviderEnabled() ? ['youtube', 'reddit'] : ['youtube'];
}

export function filterEnabledProviderPlatforms(
  values: readonly string[],
  options: { userEmail?: string | null; enforceRedditWhitelist?: boolean } = {}
): Platform[] {
  const enabled = new Set<Platform>(getEnabledProviderPlatforms());
  return values.filter((value): value is Platform => {
    if (!enabled.has(value as Platform)) return false;
    if (
      value === 'reddit' &&
      options.enforceRedditWhitelist &&
      !isRedditBetaUserAllowed(options.userEmail)
    ) {
      return false;
    }
    return true;
  });
}

export function getSelectableSearchPlatforms(): string[] {
  const base = ['youtube', 'x', 'facebook'];
  if (isRedditProviderEnabled()) {
    base.splice(1, 0, 'reddit');
  }
  return base;
}
