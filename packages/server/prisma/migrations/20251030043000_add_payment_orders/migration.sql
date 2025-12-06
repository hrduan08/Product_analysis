-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('wechat', 'alipay', 'mock');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'canceled', 'expired');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "payment_order_id" UUID;

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "subscription_id" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "description" TEXT,
    "out_trade_no" TEXT NOT NULL,
    "external_trade_no" TEXT,
    "external_payload" JSONB,
    "notify_payload" JSONB,
    "expires_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_out_trade_no_key" ON "payment_orders"("out_trade_no");

-- CreateIndex
CREATE INDEX "payment_orders_user_id_status_idx" ON "payment_orders"("user_id", "status");

-- CreateIndex
CREATE INDEX "payment_orders_subscription_id_idx" ON "payment_orders"("subscription_id");

-- CreateIndex
CREATE INDEX "payment_orders_plan_id_idx" ON "payment_orders"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_order_id_key" ON "invoices"("payment_order_id");

-- CreateIndex
CREATE INDEX "invoices_payment_order_id_idx" ON "invoices"("payment_order_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
