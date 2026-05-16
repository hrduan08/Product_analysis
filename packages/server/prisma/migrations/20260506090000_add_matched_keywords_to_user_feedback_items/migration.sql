ALTER TABLE "user_feedback_items"
ADD COLUMN IF NOT EXISTS "matched_keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
