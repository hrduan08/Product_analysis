function parseApiKeys(): string[] {
  const rawList = process.env.YOUTUBE_API_KEYS
    ? process.env.YOUTUBE_API_KEYS.split(',')
    : [process.env.YOUTUBE_API_KEY ?? ''];
  const keys = rawList
    .map((value) => value.trim())
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);

  if (keys.length === 0) {
    throw new Error('请配置至少一个 YOUTUBE_API_KEY 或 YOUTUBE_API_KEYS');
  }

  return keys;
}

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function parseRatio(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return defaultValue;
  }
  return Math.min(Math.max(parsed, 0), 1);
}

const apiKeys = parseApiKeys();

export const youtubeConfig = {
  apiKeys,
  defaultApiKey: apiKeys[0],
  searchMaxPerMinute: parsePositiveInt(process.env.YOUTUBE_SEARCH_MAX_PER_MINUTE, 5),
  videoMaxPerMinute: parsePositiveInt(process.env.YOUTUBE_VIDEOS_MAX_PER_MINUTE, 15),
  dailyQuotaPerKey: parsePositiveInt(process.env.YOUTUBE_DAILY_QUOTA_LIMIT, 10_000),
  saturationRatio: parseRatio(process.env.YOUTUBE_QUOTA_SATURATION_RATIO, 0.9),
  warnRatio: parseRatio(process.env.YOUTUBE_QUOTA_WARN_RATIO, 0.7),
  maxResults: Math.min(parsePositiveInt(process.env.YOUTUBE_SEARCH_MAX_RESULTS, 50), 50),
  searchUnitsPerCall: 100,
  videoUnitsPerCall: 1
} as const;
