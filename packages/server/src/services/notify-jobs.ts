import type { JobStatus, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../db/prisma.js';

export async function getLastSuccessfulJobRunAt(): Promise<Date | null> {
  const job = await prisma.notifyJob.findFirst({
    where: { status: 'success' },
    orderBy: { run_at: 'desc' },
    select: { run_at: true }
  });
  return job?.run_at ?? null;
}

type NotifyJobInput = {
  status: JobStatus;
  totalNew: number;
  totalSent?: number;
  mailMessageId?: string;
  errorMessage?: string;
  runAt?: Date;
  userId?: string;
  context?: Prisma.JsonObject;
};

export async function recordNotifyJob(input: NotifyJobInput): Promise<void> {
  await prisma.notifyJob.create({
    data: {
      status: input.status,
      total_new: input.totalNew,
      total_sent: input.totalSent ?? 0,
      mail_message_id: input.mailMessageId ?? null,
      error_message: input.errorMessage ?? null,
      run_at: input.runAt,
      user_id: input.userId ?? null,
      context: input.context ?? null
    }
  });
}
