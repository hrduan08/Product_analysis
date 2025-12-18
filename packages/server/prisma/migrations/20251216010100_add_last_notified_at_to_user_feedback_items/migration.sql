-- Add last_notified_at for tracking per-user push status
ALTER TABLE "user_feedback_items"
ADD COLUMN IF NOT EXISTS "last_notified_at" TIMESTAMPTZ(6);
