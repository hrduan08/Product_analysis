import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { VideoList } from '../components/VideoList';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { formatRunTime } from '../utils/date';
import { fetchSubscription } from '../services/billing';
import { fetchTaskHistory } from '../services/taskHistory';
import { fetchSearchConfig } from '../services/searchConfig';
import { formatPlatformList } from '../utils/platform';
import { searchFeedback } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_TOKEN ?? '';
const INSTANT_SEARCH_WHITELIST = ['474226642@qq.com', 'dhrstudy2008@126.com'];
const INSTANT_PAGE_SIZE = 20;
const INSTANT_FETCH_LIMIT = 50;
export function SearchPage() {
    const { user, logout, updateUser } = useAuth();
    const { t, lang, setLang } = useLanguage();
    const navigate = useNavigate();
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [avatarTapCount, setAvatarTapCount] = useState(0);
    const tapTimerRef = useRef(null);
    const adminUnlockedRef = useRef(false);
    const avatarRef = useRef(null);
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const [adminPasswordInput, setAdminPasswordInput] = useState('');
    const [adminPasswordError, setAdminPasswordError] = useState(null);
    const [instantQuery, setInstantQuery] = useState('');
    const [instantPlatforms, setInstantPlatforms] = useState(['youtube']);
    const [instantSearched, setInstantSearched] = useState(false);
    const [instantLoading, setInstantLoading] = useState(false);
    const [instantError, setInstantError] = useState(null);
    const [instantResults, setInstantResults] = useState([]);
    const [instantTotalCount, setInstantTotalCount] = useState(null);
    const [instantKeywordsUsed, setInstantKeywordsUsed] = useState([]);
    const [instantPlatformsUsed, setInstantPlatformsUsed] = useState([]);
    const [instantPage, setInstantPage] = useState(1);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [planExpireAt, setPlanExpireAt] = useState(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [planError, setPlanError] = useState(null);
    const [searchConfigSummary, setSearchConfigSummary] = useState(null);
    const [searchConfigLoading, setSearchConfigLoading] = useState(false);
    const [searchConfigError, setSearchConfigError] = useState(null);
    const [taskRuns, setTaskRuns] = useState([]);
    const [taskRunsLoading, setTaskRunsLoading] = useState(false);
    const [taskRunsError, setTaskRunsError] = useState(null);
    const [langOpen, setLangOpen] = useState(false);
    const canUseInstantSearch = Boolean(user?.email && INSTANT_SEARCH_WHITELIST.includes(user.email.toLowerCase()));
    const TEXT = t({
        zh: {
            notifyLabels: { feishu: '飞书', email: '邮件' },
            userStatus: { trialing: '试用中', active: '已订阅', past_due: '待续费', canceled: '已取消' },
            nav: { language: '语言', zh: '中文', en: 'English', dashboard: '控制台' },
            logout: { title: '退出登录', loggingOut: '退出中...', success: '已退出登录', fail: '退出失败，请稍后再试' },
            banner: {
                welcome: '欢迎回来，',
                verify: '邮箱尚未验证，',
                verifyLink: '前往验证',
                verifySuffix: ' 后方可创建订阅。',
                subscription: '订阅状态',
                benefits: '权益：订阅后可解锁更多任务与通知渠道',
                benefitsPrefix: '权益：',
                benefitsTasks: (n) => `${n} 个定时任务`,
                benefitsNotify: (n) => `${n} 个通知渠道`,
                defaultExpired: '待设置',
                daily: '每日定时搜索和分析',
                keywords: '关键词：',
                slots: '定时搜索时间：',
                notify: '消息通知方式：',
                summaryBtnConfigured: '修改搜索配置',
                summaryBtnEmpty: '配置搜索任务',
                trialRemaining: (d, date) => `试用剩余 ${d} 天（${date} 到期）`,
                trialExpired: (date) => `试用已到期（${date}）`,
                expireLabelTrial: '试用到期：',
                expireLabelNormal: '到期日：',
                statusPending: '未登录',
                statusPastDue: '会员已到期',
                statusYearly: '已订阅年度会员',
                statusMonthly: '已订阅月度会员'
            },
            instant: {
                title: '即时搜索',
                platformLabel: '平台',
                keywordLabel: '搜索关键词',
                placeholder: '例如：Helio Strap 最新评价',
                searchBtn: '立即搜索',
                searching: '搜索中...',
                empty: '暂未检索到相关内容，换个关键词或平台试试。',
                copied: '链接已复制',
                copyFail: '复制失败，请手动复制',
                fail: '搜索失败，请稍后重试',
                summary: (kw, pf, total) => `关键词：${kw} · 平台：${pf} · 共 ${total} 条`,
                prev: '上一页',
                next: '下一页',
                pageInfo: (p, total) => `第 ${p} / ${total} 页`,
                historyTitle: '搜索记录',
                historyAll: '查看全部任务',
                table: { keywords: '关键词', platform: '平台', latest: '最近运行', new: '新增反馈', status: '状态', loading: '加载中...', empty: '暂无执行记录' }
            },
            toast: { loadPlanFail: '加载订阅信息失败' },
            accountPopover: { title: '打开账号信息', status: '账户状态：', logout: '退出登录' }
        },
        en: {
            notifyLabels: { feishu: 'Feishu', email: 'Email' },
            userStatus: { trialing: 'Trial', active: 'Active', past_due: 'Past due', canceled: 'Canceled' },
            nav: { language: 'Language', zh: 'Chinese', en: 'English', dashboard: 'Dashboard' },
            logout: { title: 'Log out', loggingOut: 'Logging out...', success: 'Logged out', fail: 'Failed to log out, please try again' },
            banner: {
                welcome: 'Welcome back, ',
                verify: 'Email not verified, ',
                verifyLink: 'verify now',
                verifySuffix: ' before creating a subscription.',
                subscription: 'Subscription status',
                benefits: 'Benefits: unlock more tasks and channels after subscribing',
                benefitsPrefix: 'Benefits: ',
                benefitsTasks: (n) => `${n} scheduled tasks`,
                benefitsNotify: (n) => `${n} notification channels`,
                defaultExpired: 'Not set',
                daily: 'Daily scheduled search & analysis',
                keywords: 'Keywords: ',
                slots: 'Search time: ',
                notify: 'Notify via: ',
                summaryBtnConfigured: 'Edit search config',
                summaryBtnEmpty: 'Set up search task',
                trialRemaining: (d, date) => `Trial ends in ${d} days (${date})`,
                trialExpired: (date) => `Trial expired (${date})`,
                expireLabelTrial: 'Trial ends: ',
                expireLabelNormal: 'Expires on: ',
                statusPending: 'Not logged in',
                statusPastDue: 'Membership expired',
                statusYearly: 'Subscribed yearly',
                statusMonthly: 'Subscribed monthly'
            },
            instant: {
                title: 'Instant search',
                platformLabel: 'Platform',
                keywordLabel: 'Search keywords',
                placeholder: 'e.g. Helio Strap latest reviews',
                searchBtn: 'Search now',
                searching: 'Searching...',
                empty: 'No results found. Try other keywords or platforms.',
                copied: 'Link copied',
                copyFail: 'Copy failed, please copy manually',
                fail: 'Search failed, please try again later',
                summary: (kw, pf, total) => `Keywords: ${kw} · Platforms: ${pf} · Total ${total}`,
                prev: 'Prev',
                next: 'Next',
                pageInfo: (p, total) => `Page ${p} / ${total}`,
                historyTitle: 'Search history',
                historyAll: 'View all tasks',
                table: { keywords: 'Keywords', platform: 'Platform', latest: 'Last run', new: 'New feedback', status: 'Status', loading: 'Loading...', empty: 'No records yet' }
            },
            toast: { loadPlanFail: 'Failed to load subscription info' },
            accountPopover: { title: 'Open account', status: 'Status: ', logout: 'Log out' }
        }
    });
    const NOTIFY_LABELS = TEXT.notifyLabels;
    const USER_STATUS_LABEL = TEXT.userStatus;
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        window.setTimeout(() => setToast(null), 2400);
    };
    const trialInfo = useMemo(() => {
        if (!user || user.status !== 'trialing' || !user.trialEndsAt) {
            return null;
        }
        const endsAt = new Date(user.trialEndsAt);
        if (Number.isNaN(endsAt.getTime())) {
            return null;
        }
        const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
        const variant = diffDays <= 1 ? 'warning' : 'info';
        return {
            message: diffDays > 0 ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）` : `试用已到期（${endsAt.toLocaleDateString()}）`,
            variant
        };
    }, [user]);
    const accountStatusLabel = useMemo(() => {
        if (!user)
            return null;
        return USER_STATUS_LABEL[user.status] ?? user.status;
    }, [user]);
    const planCtaLabel = user?.status === 'trialing' || !user ? (lang === 'zh' ? '立即订阅' : 'Subscribe now') : (lang === 'zh' ? '续费' : 'Renew');
    const bannerVariant = trialInfo?.variant ?? 'info';
    const showVerifyWarning = Boolean(user && !user.emailVerified);
    const subscriptionStatusText = useMemo(() => {
        if (!user)
            return TEXT.banner.statusPending;
        if (user.status === 'trialing')
            return USER_STATUS_LABEL.trialing;
        if (user.status === 'past_due')
            return TEXT.banner.statusPastDue ?? USER_STATUS_LABEL.past_due;
        if (currentPlan?.billing_interval === 'yearly') {
            return TEXT.banner.statusYearly ?? USER_STATUS_LABEL.active;
        }
        if (currentPlan?.billing_interval === 'monthly') {
            return TEXT.banner.statusMonthly ?? USER_STATUS_LABEL.active;
        }
        if (user.status === 'active')
            return USER_STATUS_LABEL.active;
        return USER_STATUS_LABEL[user.status] ?? user.status;
    }, [TEXT.banner, USER_STATUS_LABEL, currentPlan?.billing_interval, user]);
    const expirationDate = user?.status === 'trialing' ? user?.trialEndsAt ?? null : planExpireAt;
    const expirationLabel = expirationDate ? new Date(expirationDate).toLocaleDateString() : TEXT.banner.defaultExpired;
    const subscriptionBenefitsText = useMemo(() => {
        const limits = currentPlan?.limits ?? undefined;
        if (limits?.keywords || limits?.notifications) {
            const notificationsCount = limits.notifications ? limits.notifications.length : undefined;
            const parts = [];
            if (limits.keywords) {
                parts.push(lang === 'zh' ? `${limits.keywords} 个定时任务` : TEXT.banner.benefitsTasks(limits.keywords));
            }
            if (notificationsCount) {
                parts.push(lang === 'zh' ? `${notificationsCount} 个通知渠道` : TEXT.banner.benefitsNotify(notificationsCount));
            }
            const prefix = lang === 'zh' ? '权益：' : TEXT.banner.benefitsPrefix;
            return `${prefix}${parts.join(' + ')}`;
        }
        return lang === 'zh' ? '权益：订阅后可解锁更多任务与通知渠道' : TEXT.banner.benefits;
    }, [TEXT.banner, currentPlan?.limits, lang]);
    const searchPlatformsText = searchConfigSummary
        ? formatPlatformList(searchConfigSummary.platforms)
        : searchConfigLoading
            ? TEXT.instant.table.loading
            : lang === 'zh' ? '尚未配置' : 'Not set yet';
    const searchKeywordsText = searchConfigSummary && searchConfigSummary.keywords.length > 0
        ? searchConfigSummary.keywords.slice(0, 3).join(lang === 'zh' ? '、' : ', ')
        : lang === 'zh' ? '未设置关键词' : 'Not set';
    const searchTimesText = searchConfigSummary && searchConfigSummary.slots.length > 0
        ? searchConfigSummary.slots.join(lang === 'zh' ? '、' : ', ')
        : lang === 'zh' ? '未设置时间' : 'Not set';
    const searchNotifyText = searchConfigSummary && searchConfigSummary.notifyChannels.length > 0
        ? searchConfigSummary.notifyChannels.map((channel) => NOTIFY_LABELS[channel] ?? channel).join(' + ')
        : lang === 'zh' ? '未配置通知' : 'Not set';
    const searchSummaryButtonLabel = searchConfigSummary ? TEXT.banner.summaryBtnConfigured : TEXT.banner.summaryBtnEmpty;
    const searchSummaryLines = searchConfigLoading
        ? [TEXT.instant.table.loading]
        : searchConfigError
            ? [searchConfigError]
            : [
                `${TEXT.banner.keywords}${searchKeywordsText}`,
                `${TEXT.banner.slots}${searchTimesText}`,
                `${TEXT.banner.notify}${searchNotifyText}`
            ];
    const instantResultSummary = instantSearched && !instantLoading && instantResults.length > 0
        ? TEXT.instant.summary(instantKeywordsUsed.join(lang === 'zh' ? '、' : ', '), instantPlatformsUsed.map((platform) => (platform === 'youtube' ? 'YouTube' : 'Reddit')).join(' + '), instantTotalCount ?? instantResults.length)
        : null;
    const showInstantEmptyState = instantSearched && !instantLoading && instantResults.length === 0 && !instantError;
    const instantTotalPages = instantResults.length > 0 ? Math.ceil(instantResults.length / INSTANT_PAGE_SIZE) : 0;
    const pagedInstantResults = useMemo(() => {
        if (instantResults.length === 0)
            return [];
        const start = (instantPage - 1) * INSTANT_PAGE_SIZE;
        return instantResults.slice(start, start + INSTANT_PAGE_SIZE);
    }, [instantResults, instantPage]);
    if (!user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    useEffect(() => {
        if (instantTotalPages > 0 && instantPage > instantTotalPages) {
            setInstantPage(instantTotalPages);
        }
    }, [instantPage, instantTotalPages]);
    useEffect(() => {
        if (!user?.id)
            return;
        setPlanLoading(true);
        setPlanError(null);
        void fetchSubscription(user.id)
            .then((data) => {
            setCurrentPlan(data.plan);
            const expireAt = data.subscription?.current_period_end ?? data.user.planExpireAt ?? null;
            setPlanExpireAt(expireAt);
            if (user) {
                updateUser({
                    ...user,
                    status: (data.user.status ?? user.status),
                    trialStartedAt: data.user.trialStartedAt ?? null,
                    trialEndsAt: data.user.trialEndsAt ?? null,
                    planExpireAt: expireAt,
                    planId: data.plan?.id ?? data.subscription?.plan_id ?? null
                });
            }
        })
            .catch((error) => {
            setPlanError(error instanceof Error ? error.message : TEXT.toast.loadPlanFail);
        })
            .finally(() => setPlanLoading(false));
    }, [updateUser, user]);
    useEffect(() => {
        if (!user?.id) {
            setSearchConfigSummary(null);
            return;
        }
        let cancelled = false;
        setSearchConfigLoading(true);
        setSearchConfigError(null);
        void fetchSearchConfig(user.id)
            .then((response) => {
            if (!cancelled) {
                setSearchConfigSummary(response.config);
            }
        })
            .catch((error) => {
            if (!cancelled) {
                setSearchConfigError(error instanceof Error ? error.message : '加载搜索配置失败');
            }
        })
            .finally(() => {
            if (!cancelled) {
                setSearchConfigLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [user?.id]);
    useEffect(() => {
        if (!user?.id) {
            setTaskRuns([]);
            return;
        }
        let cancelled = false;
        setTaskRunsLoading(true);
        setTaskRunsError(null);
        void fetchTaskHistory({ userId: user.id, limit: 12 })
            .then((runs) => {
            if (!cancelled) {
                setTaskRuns(runs);
            }
        })
            .catch((error) => {
            if (!cancelled) {
                const message = error instanceof Error ? error.message : (lang === 'zh' ? '加载任务记录失败' : 'Failed to load records');
                setTaskRunsError(message);
            }
        })
            .finally(() => {
            if (!cancelled) {
                setTaskRunsLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [user?.id]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (avatarRef.current && !avatarRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
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
    const handleInstantPlatformToggle = (platform) => {
        setInstantPlatforms((prev) => {
            if (prev.includes(platform)) {
                return prev.filter((value) => value !== platform);
            }
            return [...prev, platform];
        });
    };
    const handleInstantSearch = async (event) => {
        event.preventDefault();
        const trimmed = instantQuery.trim();
        setInstantSearched(false);
        if (!trimmed) {
            setInstantError(lang === 'zh' ? '请输入要搜索的关键词' : 'Please enter keywords to search');
            setInstantResults([]);
            setInstantTotalCount(null);
            setInstantKeywordsUsed([]);
            return;
        }
        if (instantPlatforms.length === 0) {
            setInstantError(lang === 'zh' ? '请至少选择一个平台' : 'Select at least one platform');
            setInstantResults([]);
            setInstantTotalCount(null);
            setInstantKeywordsUsed([]);
            return;
        }
        const keywords = Array.from(new Set(trimmed
            .split(/[\n,，、|]+/)
            .map((value) => value.trim())
            .filter(Boolean)));
        if (keywords.length === 0) {
            setInstantError(lang === 'zh' ? '请输入有效的关键词' : 'Please enter valid keywords');
            setInstantResults([]);
            setInstantTotalCount(null);
            setInstantKeywordsUsed([]);
            return;
        }
        setInstantLoading(true);
        setInstantError(null);
        try {
            const responses = await Promise.all(instantPlatforms.flatMap((platform) => keywords.map(async (keyword) => {
                const data = await searchFeedback({
                    platform,
                    query: keyword,
                    limit: INSTANT_FETCH_LIMIT
                });
                return data;
            })));
            const merged = responses.flatMap((response) => response.items ?? []);
            merged.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime());
            setInstantResults(merged);
            const total = responses.reduce((sum, response) => {
                const count = response.pageInfo.totalResults ?? response.items.length ?? 0;
                return sum + count;
            }, 0);
            setInstantTotalCount(total);
            setInstantKeywordsUsed(keywords);
            setInstantPlatformsUsed(instantPlatforms);
            setInstantPage(1);
            setInstantSearched(true);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : TEXT.instant.fail;
            setInstantError(message);
            setInstantResults([]);
            setInstantTotalCount(null);
            setInstantKeywordsUsed([]);
        }
        finally {
            setInstantLoading(false);
        }
    };
    const handleInstantCopyLink = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            showToast(TEXT.instant.copied);
        }
        catch {
            showToast(TEXT.instant.copyFail, 'error');
        }
    };
    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await logout();
            showToast(TEXT.logout.success);
            navigate('/');
        }
        catch {
            showToast(TEXT.logout.fail, 'error');
        }
        finally {
            setLogoutLoading(false);
            setMenuOpen(false);
            setLangOpen(false);
        }
    };
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("header", { className: "dashboard-nav", children: [_jsxs(Link, { className: "logo-mark", to: "/", children: [_jsx("img", { src: "/assets/logos/logo.png", alt: "VoiceInsight", className: "logo-img" }), _jsxs("span", { className: "logo-word", children: ["Voice", _jsx("span", { className: "logo-word__accent", children: "Insight" })] })] }), _jsxs("div", { className: "dashboard-nav__actions", ref: avatarRef, children: [_jsxs("div", { className: "nav-lang", children: [_jsx("button", { type: "button", className: "btn text", onClick: () => setLangOpen((v) => !v), children: TEXT.nav.language }), langOpen ? (_jsxs("div", { className: "nav-lang__menu", children: [_jsx("button", { type: "button", className: `nav-lang__item${lang === 'zh' ? ' is-active' : ''}`, onClick: () => {
                                                    setLang('zh');
                                                    setLangOpen(false);
                                                }, children: TEXT.nav.zh }), _jsx("button", { type: "button", className: `nav-lang__item${lang === 'en' ? ' is-active' : ''}`, onClick: () => {
                                                    setLang('en');
                                                    setLangOpen(false);
                                                }, children: TEXT.nav.en })] })) : null] }), _jsx("button", { type: "button", className: "dashboard-avatar", onClick: handleAvatarClick, "aria-label": TEXT.accountPopover.title, children: (user?.email?.[0] ?? 'U').toUpperCase() }), menuOpen ? (_jsxs("div", { className: "account-popover account-popover--dashboard", children: [_jsx("div", { className: "account-popover__header", children: _jsx("strong", { children: user?.email ?? TEXT.banner.statusPending }) }), accountStatusLabel ? (_jsxs("p", { className: "account-popover__status", children: [TEXT.accountPopover.status, accountStatusLabel] })) : null, trialInfo ? _jsx("p", { className: "account-popover__status", children: trialInfo.message }) : null, _jsx("button", { type: "button", className: "btn secondary", onClick: handleLogout, disabled: logoutLoading, children: logoutLoading ? TEXT.logout.loggingOut : TEXT.logout.title })] })) : null] })] }), _jsxs("main", { className: "dashboard-shell", children: [_jsxs("section", { className: `account-banner account-banner--${bannerVariant}`, children: [_jsxs("div", { className: "account-banner__header", children: [_jsx("div", { className: "account-banner__identity", children: _jsx("div", { children: _jsxs("h2", { children: [TEXT.banner.welcome, user?.profile?.nickname ?? (lang === 'zh' ? '成员' : 'Member')] }) }) }), showVerifyWarning ? (_jsxs("div", { className: "account-banner__warning", children: [TEXT.banner.verify, _jsx(Link, { to: "/verify-email", children: TEXT.banner.verifyLink }), TEXT.banner.verifySuffix] })) : null] }), _jsxs("div", { className: "account-banner__summary", children: [_jsxs("div", { className: "account-banner__summary-item account-banner__summary-item--subscription", children: [_jsx("span", { className: "account-banner__summary-label", children: TEXT.banner.subscription }), _jsx("strong", { className: "account-banner__summary-value", children: subscriptionStatusText }), _jsx("p", { className: "account-banner__summary-meta", children: subscriptionBenefitsText }), _jsxs("div", { className: "account-banner__meta-line", children: [_jsxs("span", { children: [user?.status === 'trialing' ? TEXT.banner.expireLabelTrial : TEXT.banner.expireLabelNormal, expirationLabel] }), _jsx(Link, { to: "/app/subscription", className: "account-banner__summary-button", children: planCtaLabel })] }), planError ? _jsx("p", { className: "account-banner__summary-meta", children: planError }) : null] }), _jsxs("div", { className: "account-banner__summary-item", children: [_jsx("span", { className: "account-banner__summary-label", children: TEXT.banner.daily }), _jsx("strong", { className: "account-banner__summary-value", children: searchPlatformsText }), _jsxs("div", { className: "account-banner__summary-meta account-banner__summary-meta--stack", children: [_jsxs("span", { children: [TEXT.banner.keywords, searchKeywordsText] }), _jsxs("span", { children: [TEXT.banner.slots, searchTimesText] }), _jsxs("span", { children: [TEXT.banner.notify, searchNotifyText] })] }), _jsx(Link, { to: "/app/search-config", className: "account-banner__summary-link", children: searchSummaryButtonLabel })] })] })] }), _jsxs("div", { className: "dashboard-grid", children: [canUseInstantSearch ? (_jsxs("article", { className: "dashboard-card dashboard-card--wide", children: [_jsxs("div", { className: "dashboard-card__header", children: [_jsx("h3", { children: TEXT.instant.title }), instantResultSummary ? (_jsx("span", { className: "account-banner__summary-meta", children: instantResultSummary })) : null] }), _jsxs("form", { className: "instant-search-form", onSubmit: handleInstantSearch, children: [_jsx("div", { className: "instant-search-row", children: _jsxs("div", { className: "instant-search-form__group instant-search-form__group--platforms", children: [_jsx("span", { className: "instant-search-form__label", children: TEXT.instant.platformLabel }), _jsx("div", { className: "instant-search-platforms", children: ['youtube', 'reddit'].map((platform) => (_jsxs("label", { className: "instant-search-platforms__option", children: [_jsx("input", { type: "checkbox", checked: instantPlatforms.includes(platform), onChange: () => handleInstantPlatformToggle(platform) }), platform === 'youtube' ? 'YouTube' : 'Reddit'] }, platform))) })] }) }), _jsxs("div", { className: "instant-search-row instant-search-row--keywords", children: [_jsxs("div", { className: "instant-search-form__group instant-search-form__group--grow", children: [_jsx("span", { className: "instant-search-form__label", children: TEXT.instant.keywordLabel }), _jsx("input", { type: "text", value: instantQuery, onChange: (event) => setInstantQuery(event.target.value), placeholder: TEXT.instant.placeholder })] }), _jsx("div", { className: "instant-search-form__actions", children: _jsx("button", { type: "submit", className: "btn primary", disabled: instantLoading, children: instantLoading ? TEXT.instant.searching : TEXT.instant.searchBtn }) })] })] }), instantError ? _jsx("div", { className: "subscription-error", children: instantError }) : null, showInstantEmptyState ? (_jsx("p", { className: "task-table__empty", children: TEXT.instant.empty })) : null, _jsx(VideoList, { items: pagedInstantResults, onCopyLink: handleInstantCopyLink }), instantTotalPages > 1 ? (_jsxs("div", { className: "instant-search-pagination", children: [_jsx("button", { type: "button", className: "btn secondary", disabled: instantPage <= 1, onClick: () => setInstantPage((page) => Math.max(1, page - 1)), children: TEXT.instant.prev }), _jsx("span", { className: "instant-search-pagination__info", children: TEXT.instant.pageInfo(instantPage, instantTotalPages) }), _jsx("button", { type: "button", className: "btn secondary", disabled: instantPage >= instantTotalPages, onClick: () => setInstantPage((page) => Math.min(instantTotalPages, page + 1)), children: TEXT.instant.next })] })) : null] })) : null, _jsxs("article", { className: "dashboard-card dashboard-card--wide", children: [_jsxs("div", { className: "dashboard-card__header", children: [_jsx("h3", { children: TEXT.instant.historyTitle }), _jsx(Link, { to: "/app/task-history", children: TEXT.instant.historyAll })] }), _jsxs("table", { className: "task-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: TEXT.instant.table.keywords }), _jsx("th", { children: TEXT.instant.table.platform }), _jsx("th", { children: TEXT.instant.table.latest }), _jsx("th", { children: TEXT.instant.table.new }), _jsx("th", { children: TEXT.instant.table.status })] }) }), _jsx("tbody", { children: taskRunsLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "task-table__empty", children: TEXT.instant.table.loading }) })) : taskRunsError ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "task-table__empty", children: taskRunsError }) })) : taskRuns.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "task-table__empty", children: TEXT.instant.table.empty }) })) : (taskRuns.map((run) => {
                                                    const statusClass = run.status === 'success' ? 'ok' : 'warning';
                                                    const statusLabel = run.status === 'success'
                                                        ? (lang === 'zh' ? '完成' : 'Success')
                                                        : run.status === 'partial'
                                                            ? (lang === 'zh' ? '部分成功' : 'Partial')
                                                            : (lang === 'zh' ? '失败' : 'Failed');
                                                    return (_jsxs("tr", { children: [_jsx("td", { children: run.keywords.length ? run.keywords.join(lang === 'zh' ? '、' : ', ') : (lang === 'zh' ? '未设置' : 'Not set') }), _jsx("td", { children: formatPlatformList(run.platforms) }), _jsx("td", { children: formatRunTime(run.runAt, lang) }), _jsx("td", { children: lang === 'zh' ? `${run.newItems} 条` : `${run.newItems}` }), _jsx("td", { children: _jsx("span", { className: `task-status task-status--${statusClass}`, children: statusLabel }) })] }, run.id));
                                                })) })] })] })] }), toast ? _jsx(Toast, { message: toast.message, type: toast.type }) : null] }), adminModalOpen ? (_jsx("div", { className: "admin-password-modal", children: _jsxs("form", { className: "admin-password-card", onSubmit: handleAdminPasswordSubmit, children: [_jsx("h3", { children: "\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u7801" }), _jsx("p", { className: "plan-meta", children: "\u5B8C\u6210\u9A8C\u8BC1\u540E\u5C06\u8FDB\u5165\u7BA1\u7406\u5E73\u53F0\u3002" }), _jsx("input", { type: "password", value: adminPasswordInput, onChange: (event) => setAdminPasswordInput(event.target.value), placeholder: "\u7BA1\u7406\u5458\u5BC6\u7801", autoFocus: true }), adminPasswordError ? _jsx("div", { className: "subscription-error", children: adminPasswordError }) : null, _jsxs("div", { className: "admin-password-card__actions", children: [_jsx("button", { type: "button", className: "btn secondary", onClick: () => setAdminModalOpen(false), children: "\u53D6\u6D88" }), _jsx("button", { type: "submit", className: "btn primary", children: "\u786E\u5B9A" })] })] }) })) : null] }));
}
