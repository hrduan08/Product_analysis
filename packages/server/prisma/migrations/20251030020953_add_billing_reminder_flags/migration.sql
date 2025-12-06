-- AlterTable
ALTER TABLE "user_subscriptions" ADD COLUMN     "renewal_reminder_sent_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "trial_reminder_sent_at" TIMESTAMPTZ(6);
