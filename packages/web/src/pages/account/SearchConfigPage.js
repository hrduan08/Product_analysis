import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Toast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
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
    const { lang, setLang, t } = useLanguage();
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
    const avatarRef = useRef(null);
    const [langOpen, setLangOpen] = useState(false);
    const NAV_TEXT = t({
        zh: { language: '语言', zh: '中文', en: 'English', logout: '退出登录', loggingOut: '退出中...', status: '账户状态：', open: '打开账号信息' },
        en: { language: 'Language', zh: 'Chinese', en: 'English', logout: 'Log out', loggingOut: 'Logging out...', status: 'Status: ', open: 'Open account' }
    });
    const TEXT = t({
        zh: {
            title: '每日搜索和分析',
            subtitle: '系统将根据你设置的关键词，每日定时搜索并分析社媒平台中的热门用户源声。',
            loading: '页面加载中...',
            searchPlatform: '社媒平台',
            searchPlatformDesc: '你想分析哪个社媒平台的用户源声？',
            keywords: '关键词',
            keywordsDesc: '请输入你所关注的产品、话题等关键词，系统将据此搜索用户源声',
            addKeyword: '添加关键词',
            keywordPlaceholder: '例如：Apple Vision Pro、Helio Strap',
            dailyTime: '每日定时搜索时间',
            dailyTimeDesc: '你最希望每天哪个时间点更新搜索和分析结果？',
            addTime: '添加时间',
            timePlaceholder: '例如：09:00',
            notify: '消息通知',
            notifyDesc: '你希望通过哪种方式来通知搜索和分析结果？',
            notifyEmail: '邮件通知',
            notifyEmailPlaceholder: 'name@example.com',
            notifyFeishu: '飞书通知',
            feishuSteps: '飞书机器人Webhook设置步骤：',
            feishuStep1: '第一步：创建飞书群聊',
            feishuStep2: '第二步：在群聊页面右上角点击“...”，选择【设置】进入设置页面',
            feishuStep3: '第三步：在设置页面选择【群机器人】，再依次点击【添加机器人】>【自定义机器人】，然后设置好机器人名称、描述，最后点击【添加】即可',
            feishuStep4: '第四步：复制页面上显示的“Webhook地址”，添加到以下输入框并保存',
            feishuNotice: '注意：保存 Webhook地址后，请点击【测试飞书通知】，并在飞书中确认能收到测试消息。',
            feishuPlaceholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
            btnSave: '保存',
            btnTestFeishu: '测试飞书通知',
            toastSaved: '配置已保存',
            toastUpdateFail: '更新配置失败',
            toastLoadFail: '加载配置失败，请稍后重试',
            toastSessionExpired: '会话已失效，请重新登录',
            toastPlatformPending: 'Reddit平台还在适配开发中，敬请期待！',
            toastNeedPlatform: '至少选择一个平台',
            toastNeedKeyword: '请输入要添加的关键词',
            toastKeywordMax: (n) => `最多只能添加 ${n} 个关键词`,
            toastKeywordExist: '关键词已存在',
            toastNeedTime: '请选择时间',
            toastTimeFormat: '时间格式必须为 HH:mm',
            toastTimeMax: (n) => `每天最多设置 ${n} 个时间`,
            toastTimeExist: '该时间已存在',
            toastNeedWebhook: '请先填写并保存 Webhook',
            toastFeishuTestOk: '飞书测试通知已发送',
            toastFeishuTestFail: '飞书测试通知发送失败，请稍后重试',
            toastNeedEmail: '邮箱不能为空',
            toastEmailInvalid: '邮箱格式不正确',
            toastNeedNotifyChannel: '至少保留一个通知方式',
            keywordsLabel: '关键词列表',
            slotsLabel: '定时搜索时间',
            notifyLabel: '通知方式',
            summaryLoaded: '加载完成',
            labelFeishuStatus: '飞书状态：'
        },
        en: {
            title: 'Daily search & analysis',
            subtitle: 'We search and analyze hot social feedback daily based on your keywords.',
            loading: 'Loading...',
            searchPlatform: 'Social platforms',
            searchPlatformDesc: 'Which platforms do you want to analyze?',
            keywords: 'Keywords',
            keywordsDesc: 'Enter the product/topic keywords you care about; we will search by them',
            addKeyword: 'Add keyword',
            keywordPlaceholder: 'e.g. Apple Vision Pro, Helio Strap',
            dailyTime: 'Daily scheduled time',
            dailyTimeDesc: 'At what time do you want daily results?',
            addTime: 'Add time',
            timePlaceholder: 'e.g. 09:00',
            notify: 'Notifications',
            notifyDesc: 'How should we deliver the search & analysis results to you?',
            notifyEmail: 'Email',
            notifyEmailPlaceholder: 'name@example.com',
            notifyFeishu: 'Feishu',
            feishuSteps: 'Feishu webhook setup:',
            feishuStep1: '1) Create a Feishu group chat',
            feishuStep2: '2) In group settings (… on top right) go to Settings',
            feishuStep3: '3) Choose Group bots > Add bot > Custom bot, set name & description, click Add',
            feishuStep4: '4) Copy the “Webhook URL” and paste below, then save',
            feishuNotice: 'Note: after saving the webhook, click “Test Feishu notification” and check the group.',
            feishuPlaceholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
            btnSave: 'Save',
            btnTestFeishu: 'Test Feishu notification',
            toastSaved: 'Saved',
            toastUpdateFail: 'Update failed',
            toastLoadFail: 'Failed to load config, please try again',
            toastSessionExpired: 'Session expired, please log in again',
            toastPlatformPending: 'Reddit integration is coming soon.',
            toastNeedPlatform: 'Select at least one platform',
            toastNeedKeyword: 'Please enter a keyword',
            toastKeywordMax: (n) => `You can add up to ${n} keywords`,
            toastKeywordExist: 'Keyword already exists',
            toastNeedTime: 'Please pick a time',
            toastTimeFormat: 'Time must be HH:mm',
            toastTimeMax: (n) => `You can set up to ${n} times per day`,
            toastTimeExist: 'This time already exists',
            toastNeedWebhook: 'Please save the Webhook first',
            toastFeishuTestOk: 'Test notification sent to Feishu',
            toastFeishuTestFail: 'Failed to send Feishu test notification',
            toastNeedEmail: 'Email cannot be empty',
            toastEmailInvalid: 'Invalid email',
            toastNeedNotifyChannel: 'Keep at least one notification channel',
            keywordsLabel: 'Keywords',
            slotsLabel: 'Scheduled times',
            notifyLabel: 'Notification channels',
            summaryLoaded: 'Loaded',
            labelFeishuStatus: 'Feishu status:'
        }
    });
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
                    const message = error instanceof Error ? error.message : TEXT.toastLoadFail;
                    if (/重新登录/.test(message) || /未登录/.test(message) || /401/.test(message)) {
                        showToast(TEXT.toastSessionExpired, 'error');
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
            return lang === 'zh' ? '尚未排程' : 'Not scheduled';
        }
        try {
            const date = new Date(config.nextRunAt);
            return date.toLocaleString();
        }
        catch {
            return config.nextRunAt;
        }
    }, [config?.nextRunAt]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (avatarRef.current && !avatarRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    if (!user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    const accountStatusLabel = useMemo(() => {
        if (!user)
            return null;
        const map = lang === 'zh' ? USER_STATUS_LABEL : { trialing: 'Trial', active: 'Active', past_due: 'Past due', canceled: 'Canceled' };
        return map[user.status] ?? user.status;
    }, [lang, user]);
    const trialInfo = useMemo(() => {
        if (!user || user.status !== 'trialing' || !user.trialEndsAt)
            return null;
        const endsAt = new Date(user.trialEndsAt);
        if (Number.isNaN(endsAt.getTime()))
            return null;
        const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
        const message = diffDays > 0
            ? (lang === 'zh'
                ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）`
                : `Trial ends in ${diffDays} days (${endsAt.toLocaleDateString()})`)
            : (lang === 'zh'
                ? `试用已到期（${endsAt.toLocaleDateString()}）`
                : `Trial expired (${endsAt.toLocaleDateString()})`);
        return { message };
    }, [lang, user?.trialEndsAt]);
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
            showToast(TEXT.toastSaved);
        }
        catch (error) {
            setConfig(previous);
            setEmailDraft(previous.notifyEmail);
            setFeishuDraft(previous.feishuWebhook ?? '');
            showToast(error instanceof Error ? error.message : TEXT.toastUpdateFail, 'error');
        }
        finally {
            setSaving(false);
        }
    };
    const handlePlatformToggle = async (platform) => {
        if (!config)
            return;
        if (platform === 'reddit') {
            showToast(TEXT.toastPlatformPending);
            return;
        }
        const current = new Set(config.platforms);
        if (current.has(platform)) {
            current.delete(platform);
            if (current.size === 0) {
                showToast(TEXT.toastNeedPlatform, 'error');
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
            showToast(TEXT.toastNeedKeyword, 'error');
            return;
        }
        if (config.keywords.length >= maxKeywords) {
            showToast(TEXT.toastKeywordMax(maxKeywords), 'error');
            return;
        }
        const exists = config.keywords.some((item) => item.toLowerCase() === value.toLowerCase());
        if (exists) {
            showToast(TEXT.toastKeywordExist, 'error');
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
            showToast(TEXT.toastNeedTime, 'error');
            return;
        }
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
            showToast(TEXT.toastTimeFormat, 'error');
            return;
        }
        if (config.slots.length >= maxSlots) {
            showToast(TEXT.toastTimeMax(maxSlots), 'error');
            return;
        }
        if (config.slots.includes(value)) {
            showToast(TEXT.toastTimeExist, 'error');
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
                showToast(TEXT.toastNeedNotifyChannel, 'error');
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
            showToast(TEXT.toastNeedWebhook, 'error');
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
            showToast(TEXT.toastFeishuTestOk, 'success');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : TEXT.toastFeishuTestFail;
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
            showToast(TEXT.toastNeedEmail, 'error');
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
            showToast(lang === 'zh' ? '已退出登录' : 'Logged out');
            navigate('/');
        }
        catch {
            showToast(lang === 'zh' ? '退出失败，请稍后再试' : 'Failed to log out', 'error');
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
    const AccountNav = (_jsxs("header", { className: "dashboard-nav", children: [_jsxs(Link, { className: "logo-mark", to: "/", children: [_jsx("img", { src: "/assets/logos/logo.png", alt: "VoiceInsight", className: "logo-img" }), _jsxs("span", { className: "logo-word", children: ["Voice", _jsx("span", { className: "logo-word__accent", children: "Insight" })] })] }), _jsxs("div", { className: "dashboard-nav__actions", ref: avatarRef, children: [_jsxs("div", { className: "nav-lang", children: [_jsx("button", { type: "button", className: "btn text", onClick: () => setLangOpen((v) => !v), children: NAV_TEXT.language }), langOpen ? (_jsxs("div", { className: "nav-lang__menu", children: [_jsx("button", { type: "button", className: `nav-lang__item${lang === 'zh' ? ' is-active' : ''}`, onClick: () => {
                                            setLang('zh');
                                            setLangOpen(false);
                                        }, children: NAV_TEXT.zh }), _jsx("button", { type: "button", className: `nav-lang__item${lang === 'en' ? ' is-active' : ''}`, onClick: () => {
                                            setLang('en');
                                            setLangOpen(false);
                                        }, children: NAV_TEXT.en })] })) : null] }), _jsxs("div", { className: "nav-avatar-wrapper", children: [_jsx("button", { type: "button", className: "dashboard-avatar", onClick: handleAvatarClick, "aria-label": NAV_TEXT.open, children: (user.email?.[0] ?? 'U').toUpperCase() }), menuOpen ? (_jsxs("div", { className: "account-popover account-popover--dashboard", children: [_jsx("div", { className: "account-popover__header", children: _jsx("strong", { children: user.email }) }), accountStatusLabel ? (_jsxs("p", { className: "account-popover__status", children: [NAV_TEXT.status, accountStatusLabel] })) : null, trialInfo ? _jsx("p", { className: "account-popover__status", children: trialInfo.message }) : null, _jsx("button", { type: "button", className: "btn secondary", onClick: () => void handleLogout(), disabled: logoutLoading, children: logoutLoading ? NAV_TEXT.loggingOut : NAV_TEXT.logout })] })) : null] })] })] }));
    if (loading) {
        return (_jsxs("div", { className: "dashboard", children: [AccountNav, _jsx("div", { className: "dashboard-shell config-page", children: _jsx("header", { className: "config-header", children: _jsxs("div", { children: [_jsx("h1", { children: TEXT.loading }), _jsx("p", { children: TEXT.loading })] }) }) })] }));
    }
    if (!config) {
        return (_jsxs("div", { className: "dashboard", children: [AccountNav, _jsx("div", { className: "dashboard-shell config-page", children: _jsxs("header", { className: "config-header", children: [_jsxs("div", { children: [_jsx("h1", { children: TEXT.title }), _jsx("p", { children: TEXT.toastLoadFail })] }), _jsx(Link, { to: "/app", className: "config-link", children: lang === 'zh' ? '返回控制台' : 'Back to dashboard' })] }) })] }));
    }
    const feishuEnabled = config.notifyChannels.includes('feishu');
    const emailEnabled = config.notifyChannels.includes('email');
    const feishuStatusLabel = config.feishuStatus === 'ok'
        ? lang === 'zh' ? '可用' : 'OK'
        : config.feishuStatus === 'failed'
            ? lang === 'zh' ? '测试失败' : 'Failed'
            : lang === 'zh' ? '待测试' : 'Not tested';
    const feishuLastTestDisplay = config.feishuLastTestedAt
        ? new Date(config.feishuLastTestedAt).toLocaleString()
        : lang === 'zh' ? '尚未测试' : 'Not tested';
    const feishuWebhookDirty = feishuDraft.trim() !== (config?.feishuWebhook ? config.feishuWebhook.trim() : '');
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard", children: [AccountNav, _jsxs("div", { className: "dashboard-shell config-page", children: [_jsxs("header", { className: "config-header", children: [_jsxs("div", { children: [_jsx("h1", { children: TEXT.title }), _jsx("p", { children: TEXT.subtitle })] }), _jsx(Link, { to: "/app", className: "config-link", children: lang === 'zh' ? '返回控制台' : 'Back to dashboard' })] }), _jsxs("section", { className: "config-section", children: [_jsx("h3", { children: lang === 'zh' ? '1. 选择社媒平台' : '1. Choose platforms' }), _jsx("p", { className: "config-section__hint", children: TEXT.searchPlatformDesc }), _jsx("div", { className: "platform-toggle", children: PLATFORM_OPTIONS.map((option) => (_jsx("button", { type: "button", className: `platform-option ${config.platforms.includes(option.value) ? 'active' : ''}`, onClick: () => void handlePlatformToggle(option.value), disabled: saving, children: option.label }, option.value))) }), (config.platforms.includes('x') || config.platforms.includes('facebook')) && (_jsx("p", { className: "config-tip", children: lang === 'zh' ? 'X 与 Facebook 将在后续版本接入，无需重复操作。' : 'X and Facebook will be supported later.' }))] }), _jsxs("section", { className: "config-section", children: [_jsxs("div", { className: "config-section__header", children: [_jsx("h3", { children: lang === 'zh' ? '2. 关键词' : '2. Keywords' }), _jsx("span", { className: "config-section__hint", children: lang === 'zh' ? `最多 ${maxKeywords} 个` : `Up to ${maxKeywords}` })] }), _jsx("p", { className: "config-section__hint", children: TEXT.keywordsDesc }), _jsxs("div", { className: "config-chip-list", children: [config.keywords.map((keyword) => (_jsxs("span", { className: "config-chip", children: [keyword, _jsx("button", { type: "button", className: "config-chip__remove", onClick: () => void handleRemoveKeyword(keyword), disabled: saving, "aria-label": (lang === 'zh' ? '删除关键词 ' : 'Remove keyword ') + keyword, children: "\u00D7" })] }, keyword))), config.keywords.length === 0 && _jsx("span", { className: "config-empty", children: lang === 'zh' ? '暂无关键词' : 'No keywords yet' })] }), _jsxs("form", { className: "config-inline-form", onSubmit: (event) => void handleAddKeyword(event), children: [_jsx("input", { type: "text", value: keywordInput, onChange: (event) => setKeywordInput(event.target.value), placeholder: TEXT.keywordPlaceholder, disabled: saving }), _jsx("button", { type: "submit", disabled: saving || config.keywords.length >= maxKeywords, children: TEXT.addKeyword })] })] }), _jsxs("section", { className: "config-section", children: [_jsxs("div", { className: "config-section__header", children: [_jsx("h3", { children: lang === 'zh' ? '3. 每日定时搜索时间' : '3. Scheduled time' }), _jsx("span", { className: "config-section__hint", children: lang === 'zh' ? `最多 ${maxSlots} 个时间点` : `Up to ${maxSlots} times` })] }), _jsx("p", { className: "config-section__hint", children: TEXT.dailyTimeDesc }), _jsxs("div", { className: "config-chip-list", children: [config.slots.map((slot) => (_jsxs("span", { className: "config-chip", children: [slot, _jsx("button", { type: "button", className: "config-chip__remove", onClick: () => void handleRemoveSlot(slot), disabled: saving, "aria-label": (lang === 'zh' ? '删除时间 ' : 'Remove time ') + slot, children: "\u00D7" })] }, slot))), config.slots.length === 0 && _jsx("span", { className: "config-empty", children: lang === 'zh' ? '尚未设置执行时间' : 'No times set' })] }), _jsxs("form", { className: "config-inline-form", onSubmit: (event) => void handleAddSlot(event), children: [_jsx("input", { type: "time", value: timeInput, onChange: (event) => setTimeInput(event.target.value), onClick: (event) => {
                                                    const element = event.currentTarget;
                                                    element.showPicker?.();
                                                }, onFocus: (event) => {
                                                    const element = event.currentTarget;
                                                    element.showPicker?.();
                                                }, disabled: saving }), _jsx("button", { type: "submit", disabled: saving || config.slots.length >= maxSlots, children: TEXT.addTime })] })] }), _jsxs("section", { className: "config-section", children: [_jsx("h3", { children: lang === 'zh' ? '4. 消息通知' : '4. Notifications' }), _jsx("p", { className: "config-section__hint", children: TEXT.notifyDesc }), _jsx("div", { className: "platform-toggle", children: CHANNEL_ORDER.map((channel) => (_jsx("button", { type: "button", className: `platform-option ${config.notifyChannels.includes(channel) ? 'active' : ''}`, onClick: () => void handleChannelToggle(channel), disabled: saving, children: channel === 'email' ? TEXT.notifyEmail : TEXT.notifyFeishu }, channel))) }), feishuEnabled && (_jsxs(_Fragment, { children: [_jsxs("p", { className: "config-section__hint", children: [TEXT.feishuSteps, _jsx("br", {}), TEXT.feishuStep1, _jsx("br", {}), TEXT.feishuStep2, _jsx("br", {}), TEXT.feishuStep3, _jsx("br", {}), TEXT.feishuStep4] }), _jsx("p", { className: "config-section__hint config-section__hint--tight", children: TEXT.feishuNotice }), _jsxs("div", { className: "config-inline-form", children: [_jsx("input", { type: "url", value: feishuDraft, onChange: (event) => setFeishuDraft(event.target.value), placeholder: TEXT.feishuPlaceholder, disabled: saving }), _jsx("button", { type: "button", onClick: () => void handleFeishuSubmit(), disabled: saving || !feishuWebhookDirty, children: TEXT.btnSave }), _jsx("button", { type: "button", onClick: () => void handleFeishuTest(), disabled: saving || testingFeishu || !config.feishuWebhook, children: testingFeishu ? (lang === 'zh' ? '测试中…' : 'Testing...') : TEXT.btnTestFeishu })] }), _jsxs("p", { className: "config-section__hint", children: [TEXT.labelFeishuStatus, feishuStatusLabel, " \u00B7 ", feishuLastTestDisplay] })] })), emailEnabled && (_jsxs(_Fragment, { children: [_jsx("p", { className: "config-section__hint", children: lang === 'zh' ? '邮件通知将发送到以下邮箱，可修改为其他地址。' : 'Email notifications will be sent to the address below.' }), _jsxs("div", { className: "config-inline-form config-inline-form--single", children: [_jsx("input", { type: "email", value: emailDraft, onChange: (event) => setEmailDraft(event.target.value), onBlur: () => void handleEmailSubmit(), placeholder: TEXT.notifyEmailPlaceholder, disabled: saving }), _jsx("button", { type: "button", onClick: () => void handleEmailSubmit(), disabled: saving || emailDraft.trim() === config.notifyEmail.trim(), children: TEXT.btnSave })] })] }))] }), toast && (_jsx("div", { className: "toast-container", children: _jsx(Toast, { message: toast.message, type: toast.type, onClose: () => setToast(null) }) }))] })] }), adminModalOpen ? (_jsx("div", { className: "admin-password-modal", children: _jsxs("form", { className: "admin-password-card", onSubmit: handleAdminPasswordSubmit, children: [_jsx("h3", { children: lang === 'zh' ? '输入管理员密码' : 'Enter admin password' }), _jsx("p", { className: "plan-meta", children: lang === 'zh' ? '完成验证后将进入管理平台。' : 'After verification you will enter admin console.' }), _jsx("input", { type: "password", value: adminPasswordInput, onChange: (event) => setAdminPasswordInput(event.target.value), placeholder: lang === 'zh' ? '管理员密码' : 'Admin password', autoFocus: true }), adminPasswordError ? _jsx("div", { className: "subscription-error", children: adminPasswordError }) : null, _jsxs("div", { className: "admin-password-card__actions", children: [_jsx("button", { type: "button", className: "btn secondary", onClick: () => setAdminModalOpen(false), children: lang === 'zh' ? '取消' : 'Cancel' }), _jsx("button", { type: "submit", className: "btn primary", children: lang === 'zh' ? '确定' : 'Confirm' })] })] }) })) : null] }));
}
function sortSlots(slots) {
    return slots
        .slice()
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
