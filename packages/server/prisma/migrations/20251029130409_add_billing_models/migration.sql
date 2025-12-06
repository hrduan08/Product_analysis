/*
  Warnings:

  - The `plan_id` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "plan_id",
ADD COLUMN     "plan_id" UUID,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "billing_interval" "BillingInterval" NOT NULL DEFAULT 'monthly',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "limits" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_start" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ(6),
    "trial_ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "subscription_id" UUID,
    "user_id" UUID NOT NULL,
    "plan_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'pending',
    "external_id" TEXT,
    "external_data" JSONB,
    "description" TEXT,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "user_subscriptions_user_id_status_idx" ON "user_subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_subscriptions_plan_id_idx" ON "user_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "user_subscriptions_current_period_end_idx" ON "user_subscriptions"("current_period_end");

-- CreateIndex
CREATE INDEX "invoices_user_id_idx" ON "invoices"("user_id");

-- CreateIndex
CREATE INDEX "invoices_subscription_id_idx" ON "invoices"("subscription_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
