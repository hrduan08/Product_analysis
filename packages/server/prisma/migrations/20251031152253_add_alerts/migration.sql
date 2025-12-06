-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'warning',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "last_triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_notified_at" TIMESTAMPTZ(6),
    "payload" JSONB,
    "source" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alerts_dedupe_key_key" ON "alerts"("dedupe_key");

-- CreateIndex
CREATE INDEX "alerts_last_triggered_at_idx" ON "alerts"("last_triggered_at" DESC);
