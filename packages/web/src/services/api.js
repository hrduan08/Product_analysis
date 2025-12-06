export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
export async function searchFeedback({ platform, query, cursor, limit, signal }) {
    const params = new URLSearchParams({
        platform,
        query: query.trim()
    });
    if (cursor) {
        params.append('cursor', cursor);
    }
    if (limit) {
        params.append('limit', String(limit));
    }
    const response = await fetch(`${API_BASE}/api/search?${params.toString()}`, { signal });
    if (!response.ok) {
        let message = '服务暂不可用，请稍后重试';
        try {
            const data = (await response.json());
            if (data.message) {
                message = data.message;
            }
        }
        catch {
            // ignore JSON parse error
        }
        throw new Error(message);
    }
    return (await response.json());
}
