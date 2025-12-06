-- CreateTable
CREATE TABLE "youtube_quota_usage" (
    "id" UUID NOT NULL,
    "api_key" TEXT NOT NULL,
    "usage_date" DATE NOT NULL,
    "search_calls" INTEGER NOT NULL DEFAULT 0,
    "video_calls" INTEGER NOT NULL DEFAULT 0,
    "units_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "youtube_quota_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "youtube_quota_usage_api_key_usage_date_key" ON "youtube_quota_usage"("api_key", "usage_date");
