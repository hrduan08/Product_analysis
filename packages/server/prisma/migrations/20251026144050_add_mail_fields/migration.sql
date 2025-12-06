-- AlterTable
ALTER TABLE "notify_jobs" ADD COLUMN     "mail_message_id" TEXT,
ADD COLUMN     "total_sent" INTEGER NOT NULL DEFAULT 0;
