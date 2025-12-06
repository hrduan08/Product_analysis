-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('youtube', 'reddit');

-- CreateEnum
CREATE TYPE "SubscriptionFrequency" AS ENUM ('instant', 'daily', 'weekly');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('success', 'failed', 'partial');

-- CreateTable
CREATE TABLE "feedback_items" (
    "id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "external_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "url" TEXT NOT NULL,
    "permalink" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6),
    "view_count" INTEGER,
    "score" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platforms" "Platform"[] DEFAULT ARRAY['youtube', 'reddit']::"Platform"[],
    "frequency" "SubscriptionFrequency" NOT NULL DEFAULT 'daily',
    "last_notified" TIMESTAMPTZ(6),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notify_jobs" (
    "id" UUID NOT NULL,
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "JobStatus" NOT NULL,
    "total_new" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "notify_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_items_keyword_last_seen_at_idx" ON "feedback_items"("keyword", "last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "feedback_items_first_seen_at_idx" ON "feedback_items"("first_seen_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_items_platform_external_id_key" ON "feedback_items"("platform", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_email_key" ON "subscriptions"("email");

-- CreateIndex
CREATE INDEX "notify_jobs_status_run_at_idx" ON "notify_jobs"("status", "run_at" DESC);
