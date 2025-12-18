export type TaskRun = {
    id: string;
    runAt: string;
    status: 'success' | 'failed' | 'partial';
    processStatus?: 'success' | 'failed' | 'partial' | null;
    notifyStatus?: 'success' | 'failed' | 'partial' | null;
    newItems: number;
    totalSent: number;
    keywords: string[];
    platforms: string[];
    slots: string[];
    notifyChannels: string[];
    errorMessage: string | null;
};
export declare function fetchTaskHistory(params: {
    userId: string;
    limit?: number;
}): Promise<TaskRun[]>;
