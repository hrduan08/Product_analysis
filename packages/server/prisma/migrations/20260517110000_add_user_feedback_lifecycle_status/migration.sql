ALTER TABLE "user_feedback_items"
  ADD COLUMN "lifecycle_status" TEXT NOT NULL DEFAULT 'candidate',
  ADD COLUMN "status_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

CREATE INDEX "user_feedback_items_lifecycle_status_idx"
  ON "user_feedback_items"("lifecycle_status");
