/*
  Warnings:

  - The `process_status` column on the `notify_jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `notify_status` column on the `notify_jobs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "notify_jobs" DROP COLUMN "process_status",
ADD COLUMN     "process_status" "JobStatus",
DROP COLUMN "notify_status",
ADD COLUMN     "notify_status" "JobStatus";
