import { API_BASE } from './api';
export async function fetchTaskHistory(params) {
    const query = new URLSearchParams({ userId: params.userId });
    if (params.limit) {
        query.set('limit', String(params.limit));
    }
    const response = await fetch(`${API_BASE}/api/app/task-history?${query.toString()}`);
    if (!response.ok) {
        throw new Error('获取任务执行记录失败');
    }
    const data = (await response.json());
    return data.runs;
}
