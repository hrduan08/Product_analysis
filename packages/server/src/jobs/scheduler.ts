import cron from 'node-cron';

import { billingReminderConfig } from '../config/billing.js'; // 引入订阅提醒配置。
import { userSearchCronConfig } from '../config/user-search-cron.js';
import { runBillingReminderJob } from './billing-reminder.js'; // 引入订阅提醒任务执行函数。
import { notifyAlert } from '../services/alert/notifier.js';
import { runUserSearchConfigJobs } from './user-search-runner.js';

let billingTask: cron.ScheduledTask | null = null; // 订阅提醒任务的 Cron 实例。
let billingRunning = false; // 标记订阅提醒任务是否正在执行。
let userSearchTask: cron.ScheduledTask | null = null;
let userSearchRunning = false;

export function initScheduledJobs(): void {
  if (billingReminderConfig.enabled) { // 当订阅提醒启用时配置 Cron 调度。
    if (!cron.validate(billingReminderConfig.schedule)) { // 校验提醒 Cron 表达式是否有效。
      console.error(`[cron] 无效的 BILLING_REMINDER_CRON：${billingReminderConfig.schedule}`); // 输出错误日志提醒配置问题。
    } else { // Cron 表达式有效。
      billingTask = cron.schedule( // 创建订阅提醒定时任务。
        billingReminderConfig.schedule, // 使用配置的 Cron 表达式。
        () => {
          void runBillingReminderWithLock(); // 触发提醒任务，使用锁避免并发执行。
        },
        {
          timezone: billingReminderConfig.timezone // 指定提醒任务运行时区。
        }
      );

      console.log( // 输出任务启动日志。
        `[cron] 订阅提醒任务已启动：${billingReminderConfig.schedule}（${billingReminderConfig.timezone}）`
      );

      if (billingReminderConfig.runOnStartup) { // 如果配置要求启动时立即执行一次。
        void runBillingReminderWithLock(); // 直接调用提醒任务。
      }
    }
  } else {
    console.log('[cron] 订阅提醒任务已禁用'); // 输出禁用日志以便追踪。
  }

  if (userSearchCronConfig.enabled) {
    if (!cron.validate(userSearchCronConfig.schedule)) {
      console.error(
        `[cron] 无效的 USER_SEARCH_CRON_SCHEDULE：${userSearchCronConfig.schedule}`
      );
    } else {
      userSearchTask = cron.schedule(
        userSearchCronConfig.schedule,
        () => {
          void runUserSearchWithLock();
        },
        {
          timezone: userSearchCronConfig.timezone
        }
      );
      console.log(
        `[cron] 用户搜索配置任务已启动：${userSearchCronConfig.schedule}（${
          userSearchCronConfig.timezone ?? '系统时区'
        }）`
      );
      console.log('[cron] 用户搜索配置任务将在服务启动后立即补跑一次');
      void runUserSearchWithLock('startup');
    }
  } else {
    console.log('[cron] 用户搜索配置任务已禁用');
  }

  const shutdown = () => {
    if (billingTask) { // 若存在订阅提醒任务。
      billingTask.stop(); // 停止提醒任务。
      console.log('[cron] 订阅提醒任务已停止'); // 输出停止日志。
    }
    if (userSearchTask) {
      userSearchTask.stop();
      console.log('[cron] 用户搜索配置任务已停止');
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

async function runBillingReminderWithLock(): Promise<void> { // 订阅提醒任务包装，避免并发执行。
  if (billingRunning) { // 如果提醒任务正在运行。
    console.warn('[cron] 上一次订阅提醒仍在执行，跳过此次调度'); // 输出警告避免重复执行。
    return; // 直接返回不再触发新的任务。
  }

  billingRunning = true; // 将标记置为 true 表示任务开始执行。
  try {
    const result = await runBillingReminderJob(); // 执行订阅提醒逻辑并获取统计结果。
    console.log( // 输出执行完成日志包含提醒数量。
      `[cron] 订阅提醒执行完成：试用提醒 ${result.trialNotified} 个，续费提醒 ${result.renewalNotified} 个`
    );
  } catch (error) {
    console.error('[cron] 订阅提醒任务异常：', error); // 捕获异常并输出错误日志。
    void notifyAlert('订阅提醒定时任务失败', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error)
    }, {
      severity: 'warning',
      dedupeKey: 'cron:billing-reminder:error',
      tags: ['cron', 'billing'],
      source: 'scheduler',
      throttleMinutes: 30
    }).catch((alertError) => {
      console.error('[alert] 订阅提醒告警发送失败', alertError);
    });
  } finally {
    billingRunning = false; // 重置执行标记，允许后续任务再次运行。
  }
}

async function runUserSearchWithLock(trigger: 'cron' | 'startup' = 'cron'): Promise<void> {
  if (userSearchRunning) {
    console.warn(
      trigger === 'startup'
        ? '[cron] 启动补跑时发现上一次用户搜索配置任务仍在执行，跳过此次补跑'
        : '[cron] 上一次用户搜索配置任务仍在执行，跳过此次调度'
    );
    return;
  }
  userSearchRunning = true;
  const startedAt = new Date();
  try {
    if (trigger === 'startup') {
      console.log('[cron] 正在执行用户搜索配置任务启动补跑');
    }
    const result = await runUserSearchConfigJobs(startedAt, {
      ignoreNextRunAt: trigger === 'startup'
    });
    console.log(
      trigger === 'startup'
        ? `[cron] 用户搜索配置任务启动补跑完成：处理 ${result.processed} 条，触发 ${result.triggered} 条，发送 ${result.delivered} 封，跳过 ${result.skipped} 条，失败 ${result.failed} 条`
        : `[cron] 用户搜索配置任务完成：处理 ${result.processed} 条，触发 ${result.triggered} 条，发送 ${result.delivered} 封，跳过 ${result.skipped} 条，失败 ${result.failed} 条`
    );
  } catch (error) {
    console.error(
      trigger === 'startup' ? '[cron] 用户搜索配置任务启动补跑异常：' : '[cron] 用户搜索配置任务异常：',
      error
    );
    const connectivityError = isDatabaseConnectivityError(error);
    void notifyAlert(
      connectivityError
        ? '用户搜索配置任务数据库连接异常'
        : trigger === 'startup'
          ? '用户搜索配置任务启动补跑失败'
          : '用户搜索配置任务失败',
      {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
        startedAt,
        trigger
      },
      {
        severity: 'warning',
        dedupeKey: connectivityError
          ? 'cron:user-search:database-connectivity'
          : trigger === 'startup'
            ? 'cron:user-search:startup-error'
            : 'cron:user-search:error',
        tags: connectivityError
          ? ['cron', 'user-config', 'database']
          : trigger === 'startup'
            ? ['cron', 'user-config', 'startup']
            : ['cron', 'user-config'],
        source: 'user-search',
        throttleMinutes: connectivityError ? 24 * 60 : 15
      }
    ).catch((alertError) => {
      console.error('[alert] 用户搜索配置任务告警发送失败', alertError);
    });
  } finally {
    userSearchRunning = false;
  }
}

function isDatabaseConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as {
    code?: string;
    message?: string;
    name?: string;
  };

  if (maybeError.code === 'P1001' || maybeError.code === 'P1017') {
    return true;
  }

  const message = maybeError.message ?? '';
  return (
    message.includes("Can't reach database server") ||
    message.includes('Server has closed the connection') ||
    message.includes('Error in PostgreSQL connection')
  );
}
