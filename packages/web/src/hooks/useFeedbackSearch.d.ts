import type { FeedbackItem, PageInfo, Platform } from '../types/feedback';
type SearchArgs = {
    platform: Platform;
    query: string;
    cursor?: string;
    limit?: number;
};
export declare function useFeedbackSearch(initialPlatform?: Platform): {
    search: ({ platform, query, cursor, limit }: SearchArgs) => Promise<boolean>;
    loading: boolean;
    error: string | null;
    items: FeedbackItem[];
    pageInfo: PageInfo;
    lastQuery: string;
    lastPlatform: Platform;
};
export {};
