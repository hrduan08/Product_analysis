import type { Platform, SearchResponse } from '../types/feedback';
export declare const API_BASE: any;
type SearchOptions = {
    platform: Platform;
    query: string;
    cursor?: string;
    limit?: number;
    signal?: AbortSignal;
};
export declare function searchFeedback({ platform, query, cursor, limit, signal }: SearchOptions): Promise<SearchResponse>;
export {};
