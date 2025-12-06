export const userSearchCronConfig = {
  enabled: process.env.USER_SEARCH_CRON_ENABLED !== 'false',
  schedule: process.env.USER_SEARCH_CRON_SCHEDULE ?? '*/1 * * * *',
  timezone: process.env.USER_SEARCH_CRON_TIMEZONE,
  runOnStartup: process.env.USER_SEARCH_CRON_RUN_ON_STARTUP === 'true'
} as const;
