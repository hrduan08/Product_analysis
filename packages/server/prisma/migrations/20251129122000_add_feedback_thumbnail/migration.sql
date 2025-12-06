-- Add thumbnail_url column to feedback_items for storing preview images
ALTER TABLE "feedback_items"
ADD COLUMN "thumbnail_url" TEXT;
