import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { submitFeedback, uploadFeedbackAttachment } from '../services/feedback';
const CATEGORY_OPTIONS = [
    { value: 'bug', label: '遇到的问题' },
    { value: 'idea', label: '功能建议' },
    { value: 'other', label: '其他' }
];
const ANON_KEY = 'pi_anon_id';
const SUPPORT_EMAIL = 'support@product-insight.dev';
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_DESCRIPTION_LENGTH = 10;
export function FeedbackWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState({
        category: 'bug',
        title: '',
        description: '',
        contactEmail: '',
        attachments: []
    });
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const anonymousId = useMemo(() => getAnonymousId(), []);
    const diagnostics = useMemo(() => collectDiagnostics(), [isOpen]);
    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            contactEmail: user?.email ?? ''
        }));
    }, [user?.email]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (status === 'submitting')
            return;
        setStatus('submitting');
        setError(null);
        try {
            const payload = {
                ...form,
                title: form.title.trim(),
                description: form.description.trim(),
                contactEmail: form.contactEmail.trim() || undefined,
                attachments: form.attachments.length > 0
                    ? form.attachments.map(({ previewUrl, ...rest }) => rest)
                    : undefined,
                diagnostics,
                userId: user?.id,
                anonymousId
            };
            await submitFeedback(payload);
            setStatus('success');
            setForm({
                category: 'bug',
                title: '',
                description: '',
                contactEmail: user?.email ?? '',
                attachments: []
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '提交失败，请稍后重试';
            setError(message);
            setStatus('error');
        }
    };
    const isSubmitDisabled = form.description.trim().length < MIN_DESCRIPTION_LENGTH || status === 'submitting' || isUploading;
    const handleFileChange = async (event) => {
        if (!event.target.files)
            return;
        const files = Array.from(event.target.files);
        const availableSlots = MAX_ATTACHMENTS - form.attachments.length;
        const picked = files.slice(0, availableSlots);
        setIsUploading(true);
        try {
            for (const file of picked) {
                if (!file.type.startsWith('image/')) {
                    setError('仅支持上传图片文件');
                    continue;
                }
                if (file.size > MAX_FILE_SIZE) {
                    setError('单个附件不能超过 5MB');
                    continue;
                }
                const uploaded = await uploadFeedbackAttachment(file);
                setForm((prev) => ({
                    ...prev,
                    attachments: [
                        ...prev.attachments,
                        {
                            name: uploaded.name,
                            type: uploaded.type,
                            size: uploaded.size,
                            url: uploaded.url,
                            previewUrl: uploaded.url
                        }
                    ]
                }));
            }
            setError(null);
        }
        catch (uploadError) {
            const message = uploadError instanceof Error ? uploadError.message : '上传截图失败，请稍后重试';
            setError(message);
        }
        finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };
    const removeAttachment = (index) => {
        setForm((prev) => {
            const next = [...prev.attachments];
            next.splice(index, 1);
            return { ...prev, attachments: next };
        });
    };
    const closePanel = () => {
        setIsOpen(false);
        setStatus('idle');
        setError(null);
        setShowDiagnostics(false);
        setForm((prev) => ({ ...prev, attachments: [] }));
    };
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "feedback-widget__button", onClick: () => setIsOpen(true), "aria-label": "\u63D0\u4EA4\u53CD\u9988", children: "\u63D0\u4EA4\u53CD\u9988" }), isOpen ? (_jsx("div", { className: "feedback-widget__overlay", role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "feedback-widget__panel", children: [_jsxs("div", { className: "feedback-widget__panel-header", children: [_jsxs("div", { children: [_jsx("h3", { children: "\u63D0\u4EA4\u53CD\u9988" }), _jsx("p", { children: "\u8BF7\u63CF\u8FF0\u60A8\u7684\u95EE\u9898\u6216\u5EFA\u8BAE\uFF0C\u7CFB\u7EDF\u4F1A\u81EA\u52A8\u643A\u5E26\u8BCA\u65AD\u4FE1\u606F\uFF0C\u5E2E\u52A9\u6211\u4EEC\u5FEB\u901F\u5B9A\u4F4D\u3002" })] }), _jsx("button", { type: "button", className: "feedback-widget__close", onClick: closePanel, "aria-label": "\u5173\u95ED\u53CD\u9988\u9762\u677F", children: "\u00D7" })] }), status === 'success' ? (_jsxs("div", { className: "feedback-widget__status feedback-widget__status--success", children: [_jsx("p", { children: "\u611F\u8C22\u53CD\u9988\uFF01\u6211\u4EEC\u5DF2\u6536\u5230\u60A8\u7684\u4FE1\u606F\u3002" }), _jsxs("p", { children: ["\u5982\u9700\u8865\u5145\u53EF\u53D1\u9001\u90AE\u4EF6\u81F3 ", SUPPORT_EMAIL] }), _jsx("button", { type: "button", onClick: closePanel, children: "\u5173\u95ED" })] })) : (_jsxs("form", { className: "feedback-widget__form", onSubmit: handleSubmit, children: [_jsxs("div", { className: "feedback-widget__field", children: [_jsx("label", { htmlFor: "feedback-category", children: "\u53CD\u9988\u7C7B\u578B" }), _jsx("select", { id: "feedback-category", value: form.category, onChange: (event) => setForm((prev) => ({ ...prev, category: event.target.value })), children: CATEGORY_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { className: "feedback-widget__field", children: [_jsx("label", { htmlFor: "feedback-title", children: "\u6807\u9898\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { id: "feedback-title", type: "text", value: form.title, maxLength: 120, placeholder: "\u4F8B\u5982\uFF1A\u767B\u5F55\u641C\u7D22\u914D\u7F6E\u9875\u65F6\u63D0\u793A 500 \u9519\u8BEF", onChange: (event) => setForm((prev) => ({ ...prev, title: event.target.value })) })] }), _jsxs("div", { className: "feedback-widget__field", children: [_jsx("label", { htmlFor: "feedback-description", children: "\u8BE6\u7EC6\u63CF\u8FF0" }), _jsx("textarea", { id: "feedback-description", value: form.description, minLength: MIN_DESCRIPTION_LENGTH, maxLength: 3000, placeholder: "\u8BF7\u8BF4\u660E\u51FA\u73B0\u95EE\u9898\u7684\u64CD\u4F5C\u6B65\u9AA4\u3001\u671F\u671B\u7ED3\u679C\u3001\u5B9E\u9645\u7ED3\u679C\u7B49\u4FE1\u606F", onChange: (event) => setForm((prev) => ({ ...prev, description: event.target.value })), required: true })] }), _jsxs("div", { className: "feedback-widget__field", children: [_jsx("label", { htmlFor: "feedback-contact", children: "\u8054\u7CFB\u90AE\u7BB1\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { id: "feedback-contact", type: "email", value: form.contactEmail, placeholder: "\u7528\u4E8E\u6211\u4EEC\u5411\u60A8\u786E\u8BA4\u7EC6\u8282", onChange: (event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value })) })] }), _jsxs("div", { className: "feedback-widget__attachments", children: [_jsxs("div", { className: "feedback-widget__attachments-header", children: [_jsxs("label", { children: ["\u622A\u56FE\uFF08\u6700\u591A ", MAX_ATTACHMENTS, " \u5F20\uFF0C\u53EF\u9009\uFF09"] }), _jsx("span", { children: isUploading ? '上传中…' : '支持 png / jpg，单张 ≤ 5MB' })] }), _jsxs("div", { className: "feedback-widget__attachments-grid", children: [form.attachments.map((file, index) => (_jsxs("div", { className: "feedback-widget__attachment", children: [_jsx("img", { src: file.previewUrl, alt: file.name }), _jsx("button", { type: "button", onClick: () => removeAttachment(index), "aria-label": "\u79FB\u9664\u9644\u4EF6", children: "\u00D7" })] }, file.previewUrl))), form.attachments.length < MAX_ATTACHMENTS ? (_jsxs("label", { className: "feedback-widget__attachment-upload", children: [_jsx("input", { type: "file", accept: "image/png,image/jpeg,image/jpg", onChange: handleFileChange }), _jsx("span", { children: "\u4E0A\u4F20" })] })) : null] })] }), _jsxs("details", { className: "feedback-widget__diag-preview", open: showDiagnostics, onToggle: (event) => setShowDiagnostics(event.target.open), children: [_jsx("summary", { children: "\u8BCA\u65AD\u4FE1\u606F\u5C06\u81EA\u52A8\u4E0A\u4F20\uFF08\u70B9\u51FB\u67E5\u770B\uFF09" }), _jsx("pre", { children: JSON.stringify(diagnostics, null, 2) })] }), error ? _jsx("div", { className: "feedback-widget__status feedback-widget__status--error", children: error }) : null, _jsxs("div", { className: "feedback-widget__actions", children: [_jsx("button", { type: "button", onClick: closePanel, className: "feedback-widget__secondary", children: "\u53D6\u6D88" }), _jsx("button", { type: "submit", disabled: isSubmitDisabled, children: status === 'submitting' ? '提交中…' : '提交反馈' })] })] }))] }) })) : null] }));
}
function getAnonymousId() {
    if (typeof window === 'undefined') {
        return undefined;
    }
    try {
        const existing = localStorage.getItem(ANON_KEY);
        if (existing) {
            return existing;
        }
        const value = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `anon-${Date.now()}`;
        localStorage.setItem(ANON_KEY, value);
        return value;
    }
    catch {
        return undefined;
    }
}
function collectDiagnostics() {
    if (typeof window === 'undefined') {
        return {};
    }
    const navEntry = performance.getEntriesByType('navigation')[0];
    const logs = window.__PI_LOGS;
    return {
        timestamp: new Date().toISOString(),
        client: {
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            online: navigator.onLine
        },
        screen: {
            width: window.screen?.width ?? null,
            height: window.screen?.height ?? null,
            pixelRatio: window.devicePixelRatio ?? 1
        },
        performance: navEntry
            ? {
                domComplete: navEntry.domComplete,
                loadEventEnd: navEntry.loadEventEnd,
                responseStart: navEntry.responseStart
            }
            : undefined,
        logs: Array.isArray(logs) ? logs.slice(-20) : undefined
    };
}
