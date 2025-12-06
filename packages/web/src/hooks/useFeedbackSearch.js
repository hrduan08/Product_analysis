import { useCallback, useRef, useState } from 'react';
import { searchFeedback } from '../services/api';
const createEmptyPageInfo = () => ({
    totalResults: 0,
    resultsPerPage: 0,
    nextCursor: null,
    prevCursor: null,
    raw: null
});
export function useFeedbackSearch(initialPlatform = 'youtube') {
    const [items, setItems] = useState([]);
    const [pageInfo, setPageInfo] = useState(createEmptyPageInfo());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastQuery, setLastQuery] = useState('');
    const [lastPlatform, setLastPlatform] = useState(initialPlatform);
    const abortRef = useRef(null);
    const search = useCallback(async ({ platform, query, cursor, limit }) => {
        const trimmed = query.trim();
        if (!trimmed) {
            setError('请输入要搜索的关键词');
            setItems([]);
            setPageInfo(createEmptyPageInfo());
            return false;
        }
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        setError(null);
        try {
            const data = await searchFeedback({
                platform,
                query: trimmed,
                cursor,
                limit,
                signal: controller.signal
            });
            setItems(data.items ?? []);
            setPageInfo({
                totalResults: data.pageInfo.totalResults ?? 0,
                resultsPerPage: data.pageInfo.resultsPerPage ?? (data.items?.length ?? 0),
                nextCursor: data.pageInfo.nextCursor ?? null,
                prevCursor: data.pageInfo.prevCursor ?? null,
                raw: data.pageInfo.raw ?? null
            });
            setLastQuery(trimmed);
            setLastPlatform(platform);
            return true;
        }
        catch (err) {
            if (controller.signal.aborted) {
                return false;
            }
            const message = err instanceof Error ? err.message : '服务暂不可用，请稍后重试';
            setError(message);
            setItems([]);
            setPageInfo(createEmptyPageInfo());
            return false;
        }
        finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, []);
    return {
        search,
        loading,
        error,
        items,
        pageInfo,
        lastQuery,
        lastPlatform
    };
}
