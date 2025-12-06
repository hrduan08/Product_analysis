import '../src/load-env.js';

import { prisma } from '../src/db/prisma.js';
import { notifyAlert } from '../src/services/alert/notifier.js';

async function main(): Promise<void> {
  await notifyAlert(
    'Slack 通知测试',
    {
      triggeredAt: new Date().toISOString(),
      message: '手动触发测试告警'
    },
    {
      severity: 'info',
      dedupeKey: `manual:test:${Date.now()}`,
      source: 'manual-test',
      tags: ['manual', 'test']
    }
  );
}

main()
  .catch((error) => {
    console.error('[trigger-alert] failed to send alert', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
