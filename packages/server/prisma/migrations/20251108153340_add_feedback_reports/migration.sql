-- CreateTable
CREATE TABLE "feedback_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "anonymous_id" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" JSONB,
    "diagnostics" JSONB,
    "contact_email" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_notes" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_reports_created_at_idx" ON "feedback_reports"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_notes" ADD CONSTRAINT "feedback_notes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "feedback_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
