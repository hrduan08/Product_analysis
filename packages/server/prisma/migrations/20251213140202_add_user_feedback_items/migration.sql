-- CreateTable
CREATE TABLE "user_feedback_items" (
    "user_id" UUID NOT NULL,
    "feedback_item_id" UUID NOT NULL,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_feedback_items_pkey" PRIMARY KEY ("user_id","feedback_item_id")
);

-- CreateIndex
CREATE INDEX "user_feedback_items_feedback_item_id_idx" ON "user_feedback_items"("feedback_item_id");

-- CreateIndex
CREATE INDEX "user_feedback_items_last_seen_at_idx" ON "user_feedback_items"("last_seen_at");

-- AddForeignKey
ALTER TABLE "user_feedback_items" ADD CONSTRAINT "user_feedback_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback_items" ADD CONSTRAINT "user_feedback_items_feedback_item_id_fkey" FOREIGN KEY ("feedback_item_id") REFERENCES "feedback_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
