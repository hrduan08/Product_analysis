-- Add process_status and notify_status to notify_jobs
ALTER TABLE "notify_jobs"
ADD COLUMN IF NOT EXISTS "process_status" VARCHAR(16),
ADD COLUMN IF NOT EXISTS "notify_status" VARCHAR(16);
