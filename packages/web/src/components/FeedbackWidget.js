import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { submitFeedback, uploadFeedbackAttachment } from '../services/feedback';
const CATEGORY_OPTIONS = [
    { value: 'bug', label: 'bug' },
    { value: 'idea', label: 'idea' },
    { value: 'other', label: 'other' }
];
const ANON_KEY = 'pi_anon_id';
const SUPPORT_EMAIL = 'support@product-insight.dev';
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_DESCRIPTION_LENGTH = 10;
export function FeedbackWidget() {
    const { user } = useAuth();
    const { t, lang } = useLanguage();
    const TEXT = t({
        zh: {
            open: '反馈',
            title: '提交反馈',
            subtitle: '请描述您的问题或建议，系统会自动携带诊断信息，帮助我们快速定位。',
            close: '关闭反馈面板',
            success: '感谢反馈！我们已收到您的信息。',
            successMail: (email) => `如需补充可发送邮件至 ${email}`,
            closeBtn: '关闭',
            type: '反馈类型',
            typeOptions: { bug: '遇到的问题', idea: '功能建议', other: '其他' },
            titleLabel: '标题（可选）',
            titlePlaceholder: '例如：登录搜索配置页时提示 500 错误',
            descLabel: '详细描述',
            descPlaceholder: '请说明出现问题的操作步骤、期望结果、实际结果等信息',
            contactLabel: '联系邮箱（可选）',
            contactPlaceholder: '用于我们向您确认细节',
            attachments: (max) => `截图（最多 ${max} 张，可选）`,
            uploadHint: '支持 png / jpg，单张 ≤ 5MB',
            upload: '上传',
            uploadIng: '上传中…',
            remove: '移除附件',
            diagSummary: '诊断信息将自动上传（点击查看）',
            cancel: '取消',
            submit: '提交反馈',
            submitting: '提交中…',
            submitFail: '提交失败，请稍后重试',
            fileTypeError: '仅支持上传图片文件',
            fileSizeError: '单个附件不能超过 5MB',
            uploadFail: '上传截图失败，请稍后重试'
        },
        en: {
            open: 'Feedback',
            title: 'Send feedback',
            subtitle: 'Describe your issue or idea; diagnostics will be attached to help us debug.',
            close: 'Close feedback panel',
            success: 'Thanks! We have received your feedback.',
            successMail: (email) => `If needed, email us at ${email}`,
            closeBtn: 'Close',
            type: 'Type',
            typeOptions: { bug: 'Issue', idea: 'Feature request', other: 'Other' },
            titleLabel: 'Title (optional)',
            titlePlaceholder: 'e.g. 500 error on search config page',
            descLabel: 'Description',
            descPlaceholder: 'Describe steps, expected result, actual result, etc.',
            contactLabel: 'Contact email (optional)',
            contactPlaceholder: 'For us to follow up with you',
            attachments: (max) => `Screenshots (up to ${max}, optional)`,
            uploadHint: 'PNG/JPG, up to 5MB each',
            upload: 'Upload',
            uploadIng: 'Uploading…',
            remove: 'Remove attachment',
            diagSummary: 'Diagnostics will be uploaded (click to view)',
            cancel: 'Cancel',
            submit: 'Submit',
            submitting: 'Submitting…',
            submitFail: 'Submission failed, please try again later',
            fileTypeError: 'Only image files are supported',
            fileSizeError: 'Each file must be ≤ 5MB',
            uploadFail: 'Failed to upload screenshot'
        }
    });
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
            const message = err instanceof Error ? err.message : TEXT.submitFail;
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
                    setError(TEXT.fileTypeError);
                    continue;
                }
                if (file.size > MAX_FILE_SIZE) {
                    setError(TEXT.fileSizeError);
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
            const message = uploadError instanceof Error ? uploadError.message : TEXT.uploadFail;
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
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "feedback-widget__button", onClick: () => setIsOpen(true), "aria-label": TEXT.open, children: _jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", children: [_jsx("path", { d: "M5 5h14a2 2 0 012 2v6a2 2 0 01-2 2h-5l-3.5 3-1-3H5a2 2 0 01-2-2V7a2 2 0 012-2Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M8 10.5h8M8 8h8M8 13h4", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })] }) }), isOpen ? (_jsx("div", { className: "feedback-widget__overlay", role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "feedback-widget__panel", children: [_jsxs("div", { className: "feedback-widget__panel-header", children: [_jsxs("div", { children: [_jsx("h3", { children: TEXT.title }), _jsx("p", { children: TEXT.subtitle })] }), _jsx("button", { type: "button", className: "feedback-widget__close", onClick: closePanel, "aria-label": TEXT.close, children: "\u00D7" })] }), status === 'success' ? (_jsxs("div", { className: "feedback-widget__status feedback-widget__status--success", children: [_jsx("p", { children: TEXT.success }), _jsx("p", { children: TEXT.successMail(SUPPORT_EMAIL) }), _jsx("button", { type: "button", onClick: closePanel, children: TEXT.closeBtn })] })) : (_jsxs("form", { className: "feedback-widget__form", onSubmit: handleSubmit, children: [_jsxs("div", { className: "feedback-widget__field", children: [_jsx("label", { htmlFor: "feedback-category", children: TEXT.type }), _jsx("select", { id: "feedback-category", value: form.category, onChange: (event) => setForm((prev) => ({ ...prev, category: event.target.value })), children: CATEGORY_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: TEXT.typeOptions[option.value] }, option.value))) })] }), _jsxs("div", { className: "feedback-widget__field", children: [_jsx("label", { htmlFor: "feedback-title", children: TEXT.titleLabel }), _jsx("input", { id: "feedback-title", type: "text", value: form.title, maxLength: 120, placeholder: TEXT.titlePlaceholder, onChange: (event) => setForm((prev) => ({ ...prev, title: event.target.value })) })] }), _jsxs("div", { className: "feedback-widget__field", children: [_jsx("label", { htmlFor: "feedback-description", children: TEXT.descLabel }), _jsx("textarea", { id: "feedback-description", value: form.description, minLength: MIN_DESCRIPTION_LENGTH, maxLength: 3000, placeholder: TEXT.descPlaceholder, onChange: (event) => setForm((prev) => ({ ...prev, description: event.target.value })), required: true })] }), _jsxs("div", { className: "feedback-widget__field", children: [_jsx("label", { htmlFor: "feedback-contact", children: TEXT.contactLabel }), _jsx("input", { id: "feedback-contact", type: "email", value: form.contactEmail, placeholder: TEXT.contactPlaceholder, onChange: (event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value })) })] }), _jsxs("div", { className: "feedback-widget__attachments", children: [_jsxs("div", { className: "feedback-widget__attachments-header", children: [_jsx("label", { children: TEXT.attachments(MAX_ATTACHMENTS) }), _jsx("span", { children: isUploading ? TEXT.uploadIng : TEXT.uploadHint })] }), _jsxs("div", { className: "feedback-widget__attachments-grid", children: [form.attachments.map((file, index) => (_jsxs("div", { className: "feedback-widget__attachment", children: [_jsx("img", { src: file.previewUrl, alt: file.name }), _jsx("button", { type: "button", onClick: () => removeAttachment(index), "aria-label": TEXT.remove, children: "\u00D7" })] }, file.previewUrl))), form.attachments.length < MAX_ATTACHMENTS ? (_jsxs("label", { className: "feedback-widget__attachment-upload", children: [_jsx("input", { type: "file", accept: "image/png,image/jpeg,image/jpg", onChange: handleFileChange }), _jsx("span", { children: TEXT.upload })] })) : null] })] }), _jsxs("details", { className: "feedback-widget__diag-preview", open: showDiagnostics, onToggle: (event) => setShowDiagnostics(event.target.open), children: [_jsx("summary", { children: TEXT.diagSummary }), _jsx("pre", { children: JSON.stringify(diagnostics, null, 2) })] }), error ? _jsx("div", { className: "feedback-widget__status feedback-widget__status--error", children: error }) : null, _jsxs("div", { className: "feedback-widget__actions", children: [_jsx("button", { type: "button", onClick: closePanel, className: "feedback-widget__secondary", children: TEXT.cancel }), _jsx("button", { type: "submit", disabled: isSubmitDisabled, children: status === 'submitting' ? TEXT.submitting : TEXT.submit })] })] }))] }) })) : null] }));
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
