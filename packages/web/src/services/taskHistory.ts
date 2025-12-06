import { API_BASE } from './api';

export type TaskRun = {
  id: string;
  runAt: string;
  status: 'success' | 'failed' | 'partial';
  newItems: number;
  totalSent: number;
  keywords: string[];
  platforms: string[];
  slots: string[];
  notifyChannels: string[];
  errorMessage: string | null;
};

type TaskHistoryResponse = {
  runs: TaskRun[];
};

export async function fetchTaskHistory(params: { userId: string; limit?: number }): Promise<TaskRun[]> {
  const query = new URLSearchParams({ userId: params.userId });
  if (params.limit) {
    query.set('limit', String(params.limit));
  }
  const response = await fetch(`${API_BASE}/api/app/task-history?${query.toString()}`);
  if (!response.ok) {
    throw new Error('获取任务执行记录失败');
  }
  const data = (await response.json()) as TaskHistoryResponse;
  return data.runs;
}
