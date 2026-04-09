import type { JobStatus, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../db/prisma.js';

type NotifyJobInput = {
  processStatus?: JobStatus;
  notifyStatus?: JobStatus;
  totalNew: number;
  totalSent?: number;
  mailMessageId?: string;
  errorMessage?: string;
  runAt?: Date;
  userId?: string;
  context?: Prisma.JsonObject;
};

export async function recordNotifyJob(input: NotifyJobInput): Promise<void> {
  const data: Prisma.NotifyJobCreateInput = {
    process_status: input.processStatus ?? null,
    notify_status: input.notifyStatus ?? null,
    total_new: input.totalNew,
    total_sent: input.totalSent ?? 0,
    mail_message_id: input.mailMessageId ?? null,
    error_message: input.errorMessage ?? null,
    user_id: input.userId ?? null,
    context: input.context ?? null
  };

  if (input.runAt) {
    data.run_at = input.runAt;
  }

  await prisma.notifyJob.create({ data });
}
