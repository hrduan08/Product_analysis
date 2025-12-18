import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Toast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { fetchSearchConfig, patchSearchConfig, testFeishuWebhook } from '../../services/searchConfig';
const PLATFORM_OPTIONS = [
    { value: 'youtube', label: 'YouTube' },
    { value: 'reddit', label: 'Reddit' }
];
const PLATFORM_ORDER = PLATFORM_OPTIONS.map((item) => item.value);
function sortPlatforms(values) {
    return PLATFORM_ORDER.filter((value) => values.includes(value));
}
const CHANNEL_ORDER = ['feishu', 'email'];
const CHANNEL_LABEL = {
    feishu: '飞书',
    email: '邮件'
};
function sortChannels(values) {
    const set = new Set(values);
    return CHANNEL_ORDER.filter((channel) => set.has(channel));
}
const USER_STATUS_LABEL = {
    trialing: '试用中',
    active: '已订阅',
    past_due: '待续费',
    canceled: '已取消'
};
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_TOKEN ?? '';
export function SearchConfigPage() {
    const { user, setSession, logout } = useAuth();
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [keywordInput, setKeywordInput] = useState('');
    const [timeInput, setTimeInput] = useState('');
    const [emailDraft, setEmailDraft] = useState('');
    const [feishuDraft, setFeishuDraft] = useState('');
    const [testingFeishu, setTestingFeishu] = useState(false);
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [avatarTapCount, setAvatarTapCount] = useState(0);
    const tapTimerRef = useRef(null);
    const adminUnlockedRef = useRef(false);
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const [adminPasswordInput, setAdminPasswordInput] = useState('');
    const [adminPasswordError, setAdminPasswordError] = useState(null);
    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                window.clearTimeout(toastTimerRef.current);
            }
        };
    }, []);
    useEffect(() => {
        if (!user) {
            return;
        }
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const response = await fetchSearchConfig(user.id);
                if (cancelled)
                    return;
                setConfig(response.config);
                setMeta(response.meta);
                setEmailDraft(response.config.notifyEmail);
                setFeishuDraft(response.config.feishuWebhook ?? '');
            }
            catch (error) {
                if (!cancelled) {
                    const message = error instanceof Error ? error.message : '加载配置失败，请稍后重试';
                    if (/重新登录/.test(message) || /未登录/.test(message) || /401/.test(message)) {
                        showToast('会话已失效，请重新登录', 'error');
                        setSession(null);
                        setConfig(null);
                        setMeta(null);
                        setEmailDraft('');
                        setFeishuDraft('');
                        return;
                    }
                    showToast(message, 'error');
                }
            }
            finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);
    const maxKeywords = meta?.maxKeywords ?? 3;
    const maxSlots = meta?.maxSlots ?? 3;
    const nextRunDisplay = useMemo(() => {
        if (!config?.nextRunAt) {
            return '尚未排程';
        }
        try {
            const date = new Date(config.nextRunAt);
            return date.toLocaleString();
        }
        catch {
            return config.nextRunAt;
        }
    }, [config?.nextRunAt]);
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    const accountStatusLabel = useMemo(() => {
        if (!user)
            return null;
        return USER_STATUS_LABEL[user.status] ?? user.status;
    }, [user]);
    const trialInfo = useMemo(() => {
        if (!user || user.status !== 'trialing' || !user.trialEndsAt)
            return null;
        const endsAt = new Date(user.trialEndsAt);
        if (Number.isNaN(endsAt.getTime()))
            return null;
        const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
        const message = diffDays > 0
            ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）`
            : `试用已到期（${endsAt.toLocaleDateString()}）`;
        return { message };
    }, [user?.trialEndsAt]);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
    };
    const applyPatch = async (payload, requestPayload) => {
        if (!config) {
            return;
        }
        const previous = config;
        const optimistic = { ...previous, ...payload };
        setConfig(optimistic);
        setSaving(true);
        try {
            const updated = await patchSearchConfig({ userId: user.id, ...requestPayload });
            setConfig(updated);
            setEmailDraft(updated.notifyEmail);
            if ('feishuWebhook' in requestPayload) {
                setFeishuDraft(updated.feishuWebhook ?? '');
            }
            showToast('配置已保存');
        }
        catch (error) {
            setConfig(previous);
            setEmailDraft(previous.notifyEmail);
            setFeishuDraft(previous.feishuWebhook ?? '');
            showToast(error instanceof Error ? error.message : '更新配置失败', 'error');
        }
        finally {
            setSaving(false);
        }
    };
    const handlePlatformToggle = async (platform) => {
        if (!config)
            return;
        const current = new Set(config.platforms);
        if (current.has(platform)) {
            current.delete(platform);
            if (current.size === 0) {
                showToast('至少选择一个平台', 'error');
                return;
            }
        }
        else {
            current.add(platform);
        }
        const next = sortPlatforms(Array.from(current));
        await applyPatch({ platforms: next }, { platforms: next });
    };
    const handleAddKeyword = async (event) => {
        event.preventDefault();
        if (!config)
            return;
        const value = keywordInput.trim();
        if (!value) {
            showToast('请输入要添加的关键词', 'error');
            return;
        }
        if (config.keywords.length >= maxKeywords) {
            showToast(`最多只能添加 ${maxKeywords} 个关键词`, 'error');
            return;
        }
        const exists = config.keywords.some((item) => item.toLowerCase() === value.toLowerCase());
        if (exists) {
            showToast('关键词已存在', 'error');
            return;
        }
        const next = [...config.keywords, value];
        setKeywordInput('');
        await applyPatch({ keywords: next }, { keywords: next });
    };
    const handleRemoveKeyword = async (keyword) => {
        if (!config)
            return;
        const next = config.keywords.filter((item) => item !== keyword);
        await applyPatch({ keywords: next }, { keywords: next });
    };
    const handleAddSlot = async (event) => {
        event.preventDefault();
        if (!config)
            return;
        const value = timeInput.trim();
        if (!value) {
            showToast('请选择时间', 'error');
            return;
        }
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
            showToast('时间格式必须为 HH:mm', 'error');
            return;
        }
        if (config.slots.length >= maxSlots) {
            showToast(`每天最多设置 ${maxSlots} 个时间`, 'error');
            return;
        }
        if (config.slots.includes(value)) {
            showToast('该时间已存在', 'error');
            return;
        }
        const next = sortSlots([...config.slots, value]);
        setTimeInput('');
        await applyPatch({ slots: next }, { slots: next });
    };
    const handleRemoveSlot = async (slot) => {
        if (!config)
            return;
        const next = config.slots.filter((item) => item !== slot);
        await applyPatch({ slots: next }, { slots: next });
    };
    const handleChannelToggle = async (channel) => {
        if (!config)
            return;
        const current = new Set(config.notifyChannels);
        if (current.has(channel)) {
            if (current.size === 1) {
                showToast('至少保留一个通知方式', 'error');
                return;
            }
            current.delete(channel);
        }
        else {
            current.add(channel);
        }
        const next = sortChannels(Array.from(current));
        await applyPatch({ notifyChannels: next }, { notifyChannels: next });
    };
    const handleFeishuSubmit = async () => {
        if (!config)
            return;
        if (!feishuWebhookDirty)
            return;
        const value = feishuDraft.trim();
        await applyPatch({ feishuWebhook: value }, { feishuWebhook: value });
    };
    const handleFeishuTest = async () => {
        if (!config || !user)
            return;
        if (!config.feishuWebhook) {
            showToast('请先填写并保存 Webhook', 'error');
            return;
        }
        setTestingFeishu(true);
        try {
            const result = await testFeishuWebhook({ userId: user.id });
            setConfig((previous) => previous
                ? {
                    ...previous,
                    feishuStatus: result.status,
                    feishuLastTestedAt: result.testedAt
                }
                : previous);
            showToast('飞书测试通知已发送', 'success');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '飞书测试通知发送失败，请稍后重试';
            showToast(message, 'error');
            setConfig((previous) => previous
                ? {
                    ...previous,
                    feishuStatus: 'failed',
                    feishuLastTestedAt: new Date().toISOString()
                }
                : previous);
        }
        finally {
            setTestingFeishu(false);
        }
    };
    const handleEmailSubmit = async () => {
        if (!config)
            return;
        const value = emailDraft.trim();
        if (!value) {
            showToast('邮箱不能为空', 'error');
            setEmailDraft(config.notifyEmail);
            return;
        }
        if (value === config.notifyEmail) {
            return;
        }
        await applyPatch({ notifyEmail: value }, { notifyEmail: value });
    };
    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await logout();
            showToast('已退出登录');
        }
        catch {
            showToast('退出失败，请稍后再试', 'error');
        }
        finally {
            setLogoutLoading(false);
            setMenuOpen(false);
        }
    };
    const handleSecretTap = () => {
        if (!user || !SUPER_ADMINS.includes((user.email ?? '').toLowerCase())) {
            return;
        }
        if (tapTimerRef.current) {
            window.clearTimeout(tapTimerRef.current);
        }
        setAvatarTapCount((prev) => {
            const next = prev + 1;
            if (next >= 5) {
                if (tapTimerRef.current) {
                    window.clearTimeout(tapTimerRef.current);
                    tapTimerRef.current = null;
                }
                setAvatarTapCount(0);
                if (!adminUnlockedRef.current) {
                    setAdminPasswordInput('');
                    setAdminPasswordError(null);
                    setAdminModalOpen(true);
                }
                else {
                    navigate('/admin/manual-orders');
                }
                return 0;
            }
            tapTimerRef.current = window.setTimeout(() => {
                setAvatarTapCount(0);
                tapTimerRef.current = null;
            }, 3000);
            return next;
        });
    };
    const handleAvatarClick = () => {
        handleSecretTap();
        setMenuOpen((prev) => !prev);
    };
    const handleAdminPasswordSubmit = (event) => {
        event.preventDefault();
        if (!ADMIN_PASSWORD) {
            setAdminPasswordError('尚未配置管理员密码');
            return;
        }
        if (adminPasswordInput.trim() !== ADMIN_PASSWORD) {
            setAdminPasswordError('密码不正确');
            return;
        }
        window.localStorage.setItem(ADMIN_TOKEN_KEY, ADMIN_PASSWORD);
        adminUnlockedRef.current = true;
        setAdminModalOpen(false);
        navigate('/admin/manual-orders');
    };
    const AccountNav = (_jsxs("header", { className: "dashboard-nav", children: [_jsxs(Link, { className: "logo-mark", to: "/", children: [_jsx("span", { children: "PI" }), "Product Insight"] }), _jsxs("div", { className: "dashboard-nav__actions", children: [_jsx("button", { type: "button", className: "btn text", children: "\u4E2D\u6587 \u25BE" }), _jsxs("div", { className: "nav-avatar-wrapper", children: [_jsx("button", { type: "button", className: "dashboard-avatar", onClick: handleAvatarClick, "aria-label": "\u6253\u5F00\u8D26\u53F7\u4FE1\u606F", children: (user.email?.[0] ?? 'U').toUpperCase() }), menuOpen ? (_jsxs("div", { className: "account-popover account-popover--dashboard", children: [_jsx("div", { className: "account-popover__header", children: _jsx("strong", { children: user.email }) }), accountStatusLabel ? (_jsxs("p", { className: "account-popover__status", children: ["\u8D26\u6237\u72B6\u6001\uFF1A", accountStatusLabel] })) : null, trialInfo ? _jsx("p", { className: "account-popover__status", children: trialInfo.message }) : null, _jsx("button", { type: "button", className: "btn secondary", onClick: () => void handleLogout(), disabled: logoutLoading, children: logoutLoading ? '退出中...' : '退出登录' })] })) : null] })] })] }));
    if (loading) {
        return (_jsxs("div", { className: "dashboard", children: [AccountNav, _jsx("div", { className: "dashboard-shell config-page", children: _jsx("header", { className: "config-header", children: _jsxs("div", { children: [_jsx("h1", { children: "\u914D\u7F6E\u641C\u7D22\u4EFB\u52A1" }), _jsx("p", { children: "\u52A0\u8F7D\u4E2D\uFF0C\u8BF7\u7A0D\u5019\u2026" })] }) }) })] }));
    }
    if (!config) {
        return (_jsxs("div", { className: "dashboard", children: [AccountNav, _jsx("div", { className: "dashboard-shell config-page", children: _jsxs("header", { className: "config-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "\u914D\u7F6E\u641C\u7D22\u4EFB\u52A1" }), _jsx("p", { children: "\u6682\u65F6\u65E0\u6CD5\u83B7\u53D6\u914D\u7F6E\uFF0C\u8BF7\u7A0D\u540E\u5237\u65B0\u5C1D\u8BD5\u3002" })] }), _jsx(Link, { to: "/app", className: "config-link", children: "\u8FD4\u56DE\u63A7\u5236\u53F0" })] }) })] }));
    }
    const feishuEnabled = config.notifyChannels.includes('feishu');
    const emailEnabled = config.notifyChannels.includes('email');
    const feishuStatusLabel = config.feishuStatus === 'ok' ? '可用' : config.feishuStatus === 'failed' ? '测试失败' : '待测试';
    const feishuLastTestDisplay = config.feishuLastTestedAt
        ? new Date(config.feishuLastTestedAt).toLocaleString()
        : '尚未测试';
    const feishuWebhookDirty = feishuDraft.trim() !== (config?.feishuWebhook ? config.feishuWebhook.trim() : '');
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard", children: [AccountNav, _jsxs("div", { className: "dashboard-shell config-page", children: [_jsxs("header", { className: "config-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "\u914D\u7F6E\u641C\u7D22\u4EFB\u52A1" }), _jsx("p", { children: "\u914D\u7F6E\u4F60\u60F3\u5B9A\u65F6\u641C\u7D22\u7684\u5173\u952E\u8BCD\u3001\u5B9A\u65F6\u641C\u7D22\u65F6\u95F4\u3001\u641C\u7D22\u7ED3\u679C\u901A\u77E5\u65B9\u5F0F\u3002" })] }), _jsx(Link, { to: "/app", className: "config-link", children: "\u8FD4\u56DE\u63A7\u5236\u53F0" })] }), _jsxs("section", { className: "config-section", children: [_jsx("h3", { children: "1. \u9009\u62E9\u641C\u7D22\u5E73\u53F0" }), _jsx("p", { className: "config-section__hint", children: "\u9009\u62E9\u5B9A\u65F6\u641C\u7D22\u7684\u5E73\u53F0\uFF0C\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u5E73\u53F0\u3002" }), _jsx("div", { className: "platform-toggle", children: PLATFORM_OPTIONS.map((option) => (_jsx("button", { type: "button", className: `platform-option ${config.platforms.includes(option.value) ? 'active' : ''}`, onClick: () => void handlePlatformToggle(option.value), disabled: saving, children: option.label }, option.value))) }), (config.platforms.includes('x') || config.platforms.includes('facebook')) && (_jsx("p", { className: "config-tip", children: "X \u4E0E Facebook \u5C06\u5728\u540E\u7EED\u7248\u672C\u63A5\u5165\uFF0C\u65E0\u9700\u91CD\u590D\u64CD\u4F5C\u3002" }))] }), _jsxs("section", { className: "config-section", children: [_jsxs("div", { className: "config-section__header", children: [_jsx("h3", { children: "2. \u76D1\u63A7\u5173\u952E\u8BCD" }), _jsxs("span", { className: "config-section__hint", children: ["\u6700\u591A ", maxKeywords, " \u4E2A"] })] }), _jsxs("div", { className: "config-chip-list", children: [config.keywords.map((keyword) => (_jsxs("span", { className: "config-chip", children: [keyword, _jsx("button", { type: "button", className: "config-chip__remove", onClick: () => void handleRemoveKeyword(keyword), disabled: saving, "aria-label": `删除关键词 ${keyword}`, children: "\u00D7" })] }, keyword))), config.keywords.length === 0 && _jsx("span", { className: "config-empty", children: "\u6682\u65E0\u5173\u952E\u8BCD" })] }), _jsxs("form", { className: "config-inline-form", onSubmit: (event) => void handleAddKeyword(event), children: [_jsx("input", { type: "text", value: keywordInput, onChange: (event) => setKeywordInput(event.target.value), placeholder: "\u4F8B\u5982\uFF1AApple Vision Pro", disabled: saving }), _jsx("button", { type: "submit", disabled: saving || config.keywords.length >= maxKeywords, children: "\u6DFB\u52A0\u5173\u952E\u8BCD" })] })] }), _jsxs("section", { className: "config-section", children: [_jsxs("div", { className: "config-section__header", children: [_jsx("h3", { children: "3. \u6BCF\u65E5\u5B9A\u65F6\u76D1\u63A7\u65F6\u95F4" }), _jsxs("span", { className: "config-section__hint", children: ["\u6700\u591A ", maxSlots, " \u4E2A\u65F6\u95F4\u70B9"] })] }), _jsxs("div", { className: "config-chip-list", children: [config.slots.map((slot) => (_jsxs("span", { className: "config-chip", children: [slot, _jsx("button", { type: "button", className: "config-chip__remove", onClick: () => void handleRemoveSlot(slot), disabled: saving, "aria-label": `删除时间 ${slot}`, children: "\u00D7" })] }, slot))), config.slots.length === 0 && _jsx("span", { className: "config-empty", children: "\u5C1A\u672A\u8BBE\u7F6E\u6267\u884C\u65F6\u95F4" })] }), _jsxs("form", { className: "config-inline-form", onSubmit: (event) => void handleAddSlot(event), children: [_jsx("input", { type: "time", value: timeInput, onChange: (event) => setTimeInput(event.target.value), onClick: (event) => {
                                                    const element = event.currentTarget;
                                                    element.showPicker?.();
                                                }, onFocus: (event) => {
                                                    const element = event.currentTarget;
                                                    element.showPicker?.();
                                                }, disabled: saving }), _jsx("button", { type: "submit", disabled: saving || config.slots.length >= maxSlots, children: "\u6DFB\u52A0\u65F6\u95F4" })] })] }), _jsxs("section", { className: "config-section", children: [_jsx("h3", { children: "4. \u901A\u77E5\u65B9\u5F0F" }), _jsx("p", { className: "config-section__hint", children: "\u9ED8\u8BA4\u5F00\u542F\u98DE\u4E66\u63D0\u9192\uFF0C\u53EF\u4E0E\u90AE\u4EF6\u901A\u77E5\u540C\u65F6\u542F\u7528\u3002" }), _jsx("div", { className: "platform-toggle", children: CHANNEL_ORDER.map((channel) => (_jsx("button", { type: "button", className: `platform-option ${config.notifyChannels.includes(channel) ? 'active' : ''}`, onClick: () => void handleChannelToggle(channel), disabled: saving, children: CHANNEL_LABEL[channel] }, channel))) }), feishuEnabled && (_jsxs(_Fragment, { children: [_jsx("p", { className: "config-section__hint", children: "\u98DE\u4E66\u673A\u5668\u4EBA Webhook\uFF08\u98DE\u4E66\u7FA4\u804A > \u6DFB\u52A0\u673A\u5668\u4EBA > \u81EA\u5B9A\u4E49\u673A\u5668\u4EBA > \u590D\u5236 Webhook\uFF09" }), _jsx("p", { className: "config-section__hint", children: "\u586B\u5199\u5B8C\u6210\u540E\u8BF7\u5148\u70B9\u51FB\u300C\u6D4B\u8BD5\u98DE\u4E66\u901A\u77E5\u300D\uFF0C\u5230\u98DE\u4E66\u7FA4\u91CC\u786E\u8BA4\u80FD\u6536\u5230\u6D88\u606F\u518D\u7EE7\u7EED\u3002" }), _jsxs("div", { className: "config-inline-form", children: [_jsx("input", { type: "url", value: feishuDraft, onChange: (event) => setFeishuDraft(event.target.value), placeholder: "\u8BF7\u8F93\u5165\u98DE\u4E66\u673A\u5668\u4EBA\u7684 Webhook \u5730\u5740...", disabled: saving }), _jsx("button", { type: "button", onClick: () => void handleFeishuSubmit(), disabled: saving || !feishuWebhookDirty, children: "\u4FDD\u5B58 Webhook" }), _jsx("button", { type: "button", onClick: () => void handleFeishuTest(), disabled: saving || testingFeishu || !config.feishuWebhook, children: testingFeishu ? '测试中…' : '测试飞书通知' })] }), _jsxs("p", { className: "config-section__hint", children: ["\u72B6\u6001\uFF1A", feishuStatusLabel, " \u00B7 ", feishuLastTestDisplay] })] })), emailEnabled && (_jsxs(_Fragment, { children: [_jsx("p", { className: "config-section__hint", children: "\u90AE\u4EF6\u901A\u77E5\u5C06\u53D1\u9001\u5230\u4EE5\u4E0B\u90AE\u7BB1\uFF0C\u53EF\u4FEE\u6539\u4E3A\u5176\u4ED6\u5730\u5740\u3002" }), _jsxs("div", { className: "config-inline-form config-inline-form--single", children: [_jsx("input", { type: "email", value: emailDraft, onChange: (event) => setEmailDraft(event.target.value), onBlur: () => void handleEmailSubmit(), placeholder: "name@example.com", disabled: saving }), _jsx("button", { type: "button", onClick: () => void handleEmailSubmit(), disabled: saving || emailDraft.trim() === config.notifyEmail.trim(), children: "\u4FDD\u5B58\u90AE\u7BB1" })] })] }))] }), toast && (_jsx("div", { className: "toast-container", children: _jsx(Toast, { message: toast.message, type: toast.type, onClose: () => setToast(null) }) }))] })] }), adminModalOpen ? (_jsx("div", { className: "admin-password-modal", children: _jsxs("form", { className: "admin-password-card", onSubmit: handleAdminPasswordSubmit, children: [_jsx("h3", { children: "\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u7801" }), _jsx("p", { className: "plan-meta", children: "\u5B8C\u6210\u9A8C\u8BC1\u540E\u5C06\u8FDB\u5165\u7BA1\u7406\u5E73\u53F0\u3002" }), _jsx("input", { type: "password", value: adminPasswordInput, onChange: (event) => setAdminPasswordInput(event.target.value), placeholder: "\u7BA1\u7406\u5458\u5BC6\u7801", autoFocus: true }), adminPasswordError ? _jsx("div", { className: "subscription-error", children: adminPasswordError }) : null, _jsxs("div", { className: "admin-password-card__actions", children: [_jsx("button", { type: "button", className: "btn secondary", onClick: () => setAdminModalOpen(false), children: "\u53D6\u6D88" }), _jsx("button", { type: "submit", className: "btn primary", children: "\u786E\u5B9A" })] })] }) })) : null] }));
}
function sortSlots(slots) {
    return slots
        .slice()
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
