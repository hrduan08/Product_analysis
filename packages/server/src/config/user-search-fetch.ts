function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export const userSearchFetchConfig = {
  youtubeFetchLimit: Math.min(parsePositiveInt(process.env.USER_SEARCH_YOUTUBE_FETCH_LIMIT, 50), 50),
  redditFetchLimit: Math.min(parsePositiveInt(process.env.USER_SEARCH_REDDIT_FETCH_LIMIT, 100), 100)
} as const;
