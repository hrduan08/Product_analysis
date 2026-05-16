ALTER TABLE "user_search_configs"
  ADD COLUMN "product_website_url" TEXT,
  ADD COLUMN "product_commerce_url" TEXT,
  ADD COLUMN "product_description" TEXT,
  ADD COLUMN "product_profile_status" TEXT DEFAULT 'idle',
  ADD COLUMN "product_profile_error" TEXT,
  ADD COLUMN "product_profile_generated_at" TIMESTAMPTZ(6),
  ADD COLUMN "product_profile_updated_by_user" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "product_profile_brand" TEXT,
  ADD COLUMN "product_profile_product_name" TEXT,
  ADD COLUMN "product_profile_category" TEXT,
  ADD COLUMN "product_profile_core_features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "product_profile_competitors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "user_feedback_items"
  ADD COLUMN "profile_filter_status" TEXT DEFAULT 'pending',
  ADD COLUMN "profile_filter_score" DOUBLE PRECISION,
  ADD COLUMN "profile_filter_reason" TEXT,
  ADD COLUMN "profile_filtered_at" TIMESTAMPTZ(6);
