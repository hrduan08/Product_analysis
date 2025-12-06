-- Create enum for user status
CREATE TYPE "UserStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- Create users table
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ,
    "status" "UserStatus" NOT NULL DEFAULT 'trialing',
    "trial_started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trial_ends_at" TIMESTAMPTZ NOT NULL,
    "plan_id" TEXT,
    "plan_expire_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-update updated_at (Postgres 14+ can use generated column; simplest to create trigger)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create user_profiles table
CREATE TABLE "user_profiles" (
    "user_id" UUID PRIMARY KEY,
    "full_name" TEXT,
    "timezone" TEXT DEFAULT 'Asia/Shanghai',
    "locale" TEXT DEFAULT 'zh-CN',
    CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create refresh_tokens table
CREATE TABLE "refresh_tokens" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL UNIQUE,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" ("token_hash");
