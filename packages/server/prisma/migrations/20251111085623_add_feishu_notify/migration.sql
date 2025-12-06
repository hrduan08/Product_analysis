-- AlterTable
ALTER TABLE "user_search_configs" ADD COLUMN     "feishu_last_tested_at" TIMESTAMPTZ(6),
ADD COLUMN     "feishu_status" TEXT,
ADD COLUMN     "feishu_webhook" TEXT,
ADD COLUMN     "notify_channels" TEXT[] DEFAULT ARRAY['feishu']::TEXT[];
