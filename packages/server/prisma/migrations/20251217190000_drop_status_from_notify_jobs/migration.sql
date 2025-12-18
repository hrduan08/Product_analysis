-- Drop status column from notify_jobs and replace index

-- DropIndex
DROP INDEX "public"."notify_jobs_status_run_at_idx";

-- AlterTable
ALTER TABLE "notify_jobs" DROP COLUMN "status";

-- CreateIndex
CREATE INDEX "notify_jobs_run_at_idx" ON "notify_jobs"("run_at" DESC);

