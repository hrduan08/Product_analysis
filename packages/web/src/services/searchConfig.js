import { API_BASE } from './api';
export async function fetchSearchConfig(userId) {
    const response = await fetch(`${API_BASE}/api/app/search-config?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
        throw new Error('获取搜索配置失败');
    }
    const data = (await response.json());
    return data;
}
export async function patchSearchConfig(payload) {
    const response = await fetch(`${API_BASE}/api/app/search-config`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let message = '更新搜索配置失败';
        try {
            const raw = await response.json();
            if (raw && typeof raw === 'object') {
                if ('message' in raw && typeof raw.message === 'string') {
                    message = raw.message;
                }
                else if ('error' in raw && typeof raw.error === 'string') {
                    message = raw.error;
                }
            }
        }
        catch {
            // ignore parse error
        }
        throw new Error(message);
    }
    const data = (await response.json());
    return data.config;
}
export async function testFeishuWebhook(payload) {
    const response = await fetch(`${API_BASE}/api/app/search-config/test-feishu`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let message = '飞书测试通知发送失败';
        try {
            const raw = await response.json();
            if (raw && typeof raw === 'object' && typeof raw.message === 'string') {
                message = raw.message;
            }
        }
        catch {
            // ignore
        }
        throw new Error(message);
    }
    return (await response.json());
}
