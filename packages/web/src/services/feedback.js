import { API_BASE } from './api';
export async function submitFeedback(payload) {
    const response = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        try {
            const data = (await response.json());
            throw new Error(data.message ?? '提交反馈失败，请稍后重试');
        }
        catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('提交反馈失败，请稍后重试');
        }
    }
    // no payload needed
}
export async function uploadFeedbackAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/api/feedback/attachments`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        let message = '上传截图失败，请稍后再试';
        try {
            const data = (await response.json());
            if (data.message) {
                message = data.message;
            }
        }
        catch {
            // ignore
        }
        throw new Error(message);
    }
    const data = (await response.json());
    return data;
}
