const DAY_MS = 24 * 60 * 60 * 1000;
const baseTime = Date.now();

type TaskRunStatus = 'success' | 'failed';

export type TaskRunRecord = {
  id: string;
  keywords: string[];
  platforms: string;
  runAt: string;
  newItems: number;
  status: TaskRunStatus;
};

type RunTemplate = {
  keywords: string[];
  platforms: string;
  daysAgo: number;
  hour: number;
  minute: number;
  newItems: number;
  status: TaskRunStatus;
};

const templates: RunTemplate[] = [
  {
    keywords: ['smart band', '情绪监控'],
    platforms: 'YouTube + Reddit',
    daysAgo: 0,
    hour: 9,
    minute: 0,
    newItems: 18,
    status: 'success'
  },
  {
    keywords: ['vision pro', '开箱体验'],
    platforms: 'YouTube',
    daysAgo: 1,
    hour: 8,
    minute: 30,
    newItems: 7,
    status: 'success'
  },
  {
    keywords: ['客服声量', '退款政策'],
    platforms: 'Reddit',
    daysAgo: 2,
    hour: 22,
    minute: 0,
    newItems: 0,
    status: 'failed'
  },
  {
    keywords: ['AI 音箱', '新品体验'],
    platforms: 'YouTube + Reddit',
    daysAgo: 3,
    hour: 11,
    minute: 30,
    newItems: 5,
    status: 'success'
  },
  {
    keywords: ['桌面助理', '远程协作'],
    platforms: 'Reddit',
    daysAgo: 5,
    hour: 15,
    minute: 45,
    newItems: 2,
    status: 'success'
  },
  {
    keywords: ['智能客服', '体验反馈'],
    platforms: 'YouTube',
    daysAgo: 6,
    hour: 10,
    minute: 15,
    newItems: 12,
    status: 'success'
  },
  {
    keywords: ['商用机器人', '问答系统'],
    platforms: 'Reddit',
    daysAgo: 8,
    hour: 20,
    minute: 0,
    newItems: 4,
    status: 'success'
  },
  {
    keywords: ['北美市场', '品牌口碑'],
    platforms: 'YouTube',
    daysAgo: 12,
    hour: 9,
    minute: 30,
    newItems: 9,
    status: 'success'
  },
  {
    keywords: ['手术机器人', '医生反馈'],
    platforms: 'YouTube + Reddit',
    daysAgo: 18,
    hour: 13,
    minute: 15,
    newItems: 3,
    status: 'failed'
  },
  {
    keywords: ['AI 编程助手', '代码生成'],
    platforms: 'Reddit',
    daysAgo: 27,
    hour: 18,
    minute: 40,
    newItems: 6,
    status: 'success'
  },
  {
    keywords: ['智能理财', '自动投资'],
    platforms: 'YouTube',
    daysAgo: 40,
    hour: 8,
    minute: 0,
    newItems: 11,
    status: 'success'
  },
  {
    keywords: ['海外社媒', '品牌声量'],
    platforms: 'YouTube + Reddit',
    daysAgo: 60,
    hour: 21,
    minute: 10,
    newItems: 14,
    status: 'success'
  }
];

function daysAgoToISO(daysAgo: number, hour: number, minute: number): string {
  const date = new Date(baseTime - daysAgo * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const TASK_RUN_HISTORY: TaskRunRecord[] = templates.map((template, index) => ({
  id: `run-${index}`,
  keywords: template.keywords,
  platforms: template.platforms,
  runAt: daysAgoToISO(template.daysAgo, template.hour, template.minute),
  newItems: template.newItems,
  status: template.status
}));
