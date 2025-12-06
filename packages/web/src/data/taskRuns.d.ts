type TaskRunStatus = 'success' | 'failed';
export type TaskRunRecord = {
    id: string;
    keywords: string[];
    platforms: string;
    runAt: string;
    newItems: number;
    status: TaskRunStatus;
};
export declare const TASK_RUN_HISTORY: TaskRunRecord[];
export {};
