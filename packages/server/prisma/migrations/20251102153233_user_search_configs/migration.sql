-- AlterTable
ALTER TABLE "notify_jobs" ADD COLUMN     "context" JSONB,
ADD COLUMN     "user_id" UUID;

-- CreateTable
CREATE TABLE "user_search_configs" (
    "user_id" UUID NOT NULL,
    "platforms" TEXT[] DEFAULT ARRAY['youtube', 'reddit']::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "slots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notify_email" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "next_run_at" TIMESTAMPTZ(6),
    "last_run_at" TIMESTAMPTZ(6),
    "last_notified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_search_configs_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "notify_jobs_user_id_run_at_idx" ON "notify_jobs"("user_id", "run_at" DESC);

-- AddForeignKey
ALTER TABLE "notify_jobs" ADD CONSTRAINT "notify_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_search_configs" ADD CONSTRAINT "user_search_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
