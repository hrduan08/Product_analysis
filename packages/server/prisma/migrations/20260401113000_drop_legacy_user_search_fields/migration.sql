ALTER TABLE "user_search_configs"
  DROP COLUMN IF EXISTS "keywords",
  DROP COLUMN IF EXISTS "slots",
  DROP COLUMN IF EXISTS "last_run_at";
