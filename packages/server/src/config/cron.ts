function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export const cronConfig = {
  fetchLimit: parsePositiveInt(process.env.CRON_FETCH_LIMIT, 50)
} as const;
