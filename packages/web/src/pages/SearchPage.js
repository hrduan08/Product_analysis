import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VideoList } from '../components/VideoList';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { formatRunTime } from '../utils/date';
import { fetchSubscription } from '../services/billing';
import { fetchTaskHistory } from '../services/taskHistory';
import { fetchSearchConfig } from '../services/searchConfig';
import { formatPlatformList } from '../utils/platform';
import { searchFeedback } from '../services/api';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_TOKEN ?? '';
const INSTANT_SEARCH_WHITELIST = ['474226642@qq.com', 'dhrstudy2008@126.com'];
const INSTANT_PAGE_SIZE = 20;
const INSTANT_FETCH_LIMIT = 50;
const NOTIFY_LABELS = {
    feishu: '飞书',
    email: '邮件'
};
const USER_STATUS_LABEL = {
    trialing: '试用中',
    active: '已订阅',
    past_due: '待续费',
    canceled: '已取消'
};
export function SearchPage() {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [avatarTapCount, setAvatarTapCount] = useState(0);
    const tapTimerRef = useRef(null);
    const adminUnlockedRef = useRef(false);
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
    const canUseInstantSearch = Boolean(user?.email && INSTANT_SEARCH_WHITELIST.includes(user.email.toLowerCase()));
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
    const planCtaLabel = user?.status === 'trialing' || !user ? '立即订阅' : '续费';
    const bannerVariant = trialInfo?.variant ?? 'info';
    const showVerifyWarning = Boolean(user && !user.emailVerified);
    const subscriptionStatusText = useMemo(() => {
        if (!user)
            return '未登录';
        if (user.status === 'trialing')
            return '试用中';
        if (user.status === 'past_due')
            return '会员已到期';
        if (currentPlan?.billing_interval === 'yearly') {
            return '已订阅年度会员';
        }
        if (currentPlan?.billing_interval === 'monthly') {
            return '已订阅月度会员';
        }
        if (user.status === 'active') {
            return '已订阅';
        }
        return USER_STATUS_LABEL[user.status] ?? user.status;
    }, [user, currentPlan?.billing_interval]);
    const expirationDate = user?.status === 'trialing' ? user?.trialEndsAt ?? null : planExpireAt;
    const expirationLabel = expirationDate ? new Date(expirationDate).toLocaleDateString() : '待设置';
    const subscriptionBenefitsText = useMemo(() => {
        const limits = currentPlan?.limits ?? undefined;
        if (limits?.keywords || limits?.notifications) {
            const notificationsCount = limits.notifications ? limits.notifications.length : undefined;
            const parts = [];
            if (limits.keywords) {
                parts.push(`${limits.keywords} 个定时任务`);
            }
            if (notificationsCount) {
                parts.push(`${notificationsCount} 个通知渠道`);
            }
            return `权益：${parts.join(' + ')}`;
        }
        return '权益：订阅后可解锁更多任务与通知渠道';
    }, [currentPlan?.limits]);
    const searchPlatformsText = searchConfigSummary
        ? formatPlatformList(searchConfigSummary.platforms)
        : searchConfigLoading
            ? '加载中...'
            : '尚未配置';
    const searchKeywordsText = searchConfigSummary && searchConfigSummary.keywords.length > 0
        ? searchConfigSummary.keywords.slice(0, 3).join('、')
        : '未设置关键词';
    const searchTimesText = searchConfigSummary && searchConfigSummary.slots.length > 0
        ? searchConfigSummary.slots.join('、')
        : '未设置时间';
    const searchNotifyText = searchConfigSummary && searchConfigSummary.notifyChannels.length > 0
        ? searchConfigSummary.notifyChannels.map((channel) => NOTIFY_LABELS[channel] ?? channel).join(' + ')
        : '未配置通知';
    const searchSummaryButtonLabel = searchConfigSummary ? '修改搜索配置' : '配置搜索任务';
    const searchSummaryLines = searchConfigLoading
        ? ['加载中...']
        : searchConfigError
            ? [searchConfigError]
            : [
                `监控关键词：${searchKeywordsText}`,
                `定时监控时间：${searchTimesText}`,
                `结果通知方式：${searchNotifyText}`
            ];
    const instantResultSummary = instantSearched && !instantLoading && instantResults.length > 0
        ? `关键词：${instantKeywordsUsed.join('、')} · 平台：${instantPlatformsUsed
            .map((platform) => (platform === 'youtube' ? 'YouTube' : 'Reddit'))
            .join(' + ')} · 共 ${instantTotalCount ?? instantResults.length} 条`
        : null;
    const showInstantEmptyState = instantSearched && !instantLoading && instantResults.length === 0 && !instantError;
    const instantTotalPages = instantResults.length > 0 ? Math.ceil(instantResults.length / INSTANT_PAGE_SIZE) : 0;
    const pagedInstantResults = useMemo(() => {
        if (instantResults.length === 0)
            return [];
        const start = (instantPage - 1) * INSTANT_PAGE_SIZE;
        return instantResults.slice(start, start + INSTANT_PAGE_SIZE);
    }, [instantResults, instantPage]);
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
            setPlanError(error instanceof Error ? error.message : '加载订阅信息失败');
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
                const message = error instanceof Error ? error.message : '加载任务记录失败';
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
            setInstantError('请输入要搜索的关键词');
            setInstantResults([]);
            setInstantTotalCount(null);
            setInstantKeywordsUsed([]);
            return;
        }
        if (instantPlatforms.length === 0) {
            setInstantError('请至少选择一个平台');
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
            setInstantError('请输入有效的关键词');
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
            const message = error instanceof Error ? error.message : '搜索失败，请稍后重试';
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
            showToast('链接已复制');
        }
        catch {
            showToast('复制失败，请手动复制', 'error');
        }
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
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("header", { className: "dashboard-nav", children: [_jsxs(Link, { className: "logo-mark", to: "/", children: [_jsx("span", { children: "PI" }), "Product Insight"] }), _jsxs("div", { className: "dashboard-nav__actions", children: [_jsx("button", { type: "button", className: "btn text", children: "\u4E2D\u6587 \u25BE" }), _jsx("button", { type: "button", className: "dashboard-avatar", onClick: handleAvatarClick, "aria-label": "\u6253\u5F00\u8D26\u53F7\u4FE1\u606F", children: (user?.email?.[0] ?? 'U').toUpperCase() }), menuOpen ? (_jsxs("div", { className: "account-popover account-popover--dashboard", children: [_jsx("div", { className: "account-popover__header", children: _jsx("strong", { children: user?.email ?? '未登录' }) }), accountStatusLabel ? (_jsxs("p", { className: "account-popover__status", children: ["\u8D26\u6237\u72B6\u6001\uFF1A", accountStatusLabel] })) : null, trialInfo ? _jsx("p", { className: "account-popover__status", children: trialInfo.message }) : null, _jsx("button", { type: "button", className: "btn secondary", onClick: handleLogout, disabled: logoutLoading, children: logoutLoading ? '退出中...' : '退出登录' })] })) : null] })] }), _jsxs("main", { className: "dashboard-shell", children: [_jsxs("section", { className: `account-banner account-banner--${bannerVariant}`, children: [_jsxs("div", { className: "account-banner__header", children: [_jsx("div", { className: "account-banner__identity", children: _jsx("div", { children: _jsxs("h2", { children: ["\u6B22\u8FCE\u56DE\u6765\uFF0C", user?.profile?.nickname ?? '成员'] }) }) }), showVerifyWarning ? (_jsxs("div", { className: "account-banner__warning", children: ["\u90AE\u7BB1\u5C1A\u672A\u9A8C\u8BC1\uFF0C", _jsx(Link, { to: "/verify-email", children: "\u524D\u5F80\u9A8C\u8BC1" }), " \u540E\u65B9\u53EF\u521B\u5EFA\u8BA2\u9605\u3002"] })) : null] }), _jsxs("div", { className: "account-banner__summary", children: [_jsxs("div", { className: "account-banner__summary-item account-banner__summary-item--subscription", children: [_jsx("span", { className: "account-banner__summary-label", children: "\u8BA2\u9605\u72B6\u6001" }), _jsx("strong", { className: "account-banner__summary-value", children: subscriptionStatusText }), _jsx("p", { className: "account-banner__summary-meta", children: subscriptionBenefitsText }), _jsxs("div", { className: "account-banner__meta-line", children: [_jsxs("span", { children: [user?.status === 'trialing' ? '试用到期：' : '到期日：', expirationLabel] }), _jsx(Link, { to: "/app/subscription", className: "account-banner__summary-button", children: planCtaLabel })] }), planError ? _jsx("p", { className: "account-banner__summary-meta", children: planError }) : null] }), _jsxs("div", { className: "account-banner__summary-item", children: [_jsx("span", { className: "account-banner__summary-label", children: "\u641C\u7D22\u914D\u7F6E\u6458\u8981" }), _jsx("strong", { className: "account-banner__summary-value", children: searchPlatformsText }), _jsx("div", { className: "account-banner__summary-meta account-banner__summary-meta--stack", children: searchSummaryLines.map((line, index) => (_jsx("span", { children: line }, index))) }), _jsx(Link, { to: "/app/search-config", className: "account-banner__summary-link", children: searchSummaryButtonLabel })] })] })] }), _jsxs("div", { className: "dashboard-grid", children: [canUseInstantSearch ? (_jsxs("article", { className: "dashboard-card dashboard-card--wide", children: [_jsxs("div", { className: "dashboard-card__header", children: [_jsx("h3", { children: "\u5373\u65F6\u641C\u7D22" }), instantResultSummary ? (_jsx("span", { className: "account-banner__summary-meta", children: instantResultSummary })) : null] }), _jsxs("form", { className: "instant-search-form", onSubmit: handleInstantSearch, children: [_jsx("div", { className: "instant-search-row", children: _jsxs("div", { className: "instant-search-form__group instant-search-form__group--platforms", children: [_jsx("span", { className: "instant-search-form__label", children: "\u5E73\u53F0" }), _jsx("div", { className: "instant-search-platforms", children: ['youtube', 'reddit'].map((platform) => (_jsxs("label", { className: "instant-search-platforms__option", children: [_jsx("input", { type: "checkbox", checked: instantPlatforms.includes(platform), onChange: () => handleInstantPlatformToggle(platform) }), platform === 'youtube' ? 'YouTube' : 'Reddit'] }, platform))) })] }) }), _jsxs("div", { className: "instant-search-row instant-search-row--keywords", children: [_jsxs("div", { className: "instant-search-form__group instant-search-form__group--grow", children: [_jsx("span", { className: "instant-search-form__label", children: "\u641C\u7D22\u5173\u952E\u8BCD" }), _jsx("input", { type: "text", value: instantQuery, onChange: (event) => setInstantQuery(event.target.value), placeholder: "\u4F8B\u5982\uFF1AHelio Strap \u6700\u65B0\u8BC4\u4EF7" })] }), _jsx("div", { className: "instant-search-form__actions", children: _jsx("button", { type: "submit", className: "btn primary", disabled: instantLoading, children: instantLoading ? '搜索中...' : '立即搜索' }) })] })] }), instantError ? _jsx("div", { className: "subscription-error", children: instantError }) : null, showInstantEmptyState ? (_jsx("p", { className: "task-table__empty", children: "\u6682\u672A\u68C0\u7D22\u5230\u76F8\u5173\u5185\u5BB9\uFF0C\u6362\u4E2A\u5173\u952E\u8BCD\u6216\u5E73\u53F0\u8BD5\u8BD5\u3002" })) : null, _jsx(VideoList, { items: pagedInstantResults, onCopyLink: handleInstantCopyLink }), instantTotalPages > 1 ? (_jsxs("div", { className: "instant-search-pagination", children: [_jsx("button", { type: "button", className: "btn secondary", disabled: instantPage <= 1, onClick: () => setInstantPage((page) => Math.max(1, page - 1)), children: "\u4E0A\u4E00\u9875" }), _jsxs("span", { className: "instant-search-pagination__info", children: ["\u7B2C ", instantPage, " / ", instantTotalPages, " \u9875"] }), _jsx("button", { type: "button", className: "btn secondary", disabled: instantPage >= instantTotalPages, onClick: () => setInstantPage((page) => Math.min(instantTotalPages, page + 1)), children: "\u4E0B\u4E00\u9875" })] })) : null] })) : null, _jsxs("article", { className: "dashboard-card dashboard-card--wide", children: [_jsxs("div", { className: "dashboard-card__header", children: [_jsx("h3", { children: "\u5B9A\u65F6\u4EFB\u52A1\u6267\u884C\u8BB0\u5F55" }), _jsx(Link, { to: "/app/task-history", children: "\u67E5\u770B\u5168\u90E8\u4EFB\u52A1" })] }), _jsxs("table", { className: "task-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u5173\u952E\u8BCD" }), _jsx("th", { children: "\u5E73\u53F0" }), _jsx("th", { children: "\u6700\u8FD1\u8FD0\u884C" }), _jsx("th", { children: "\u65B0\u589E\u53CD\u9988" }), _jsx("th", { children: "\u72B6\u6001" })] }) }), _jsx("tbody", { children: taskRunsLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "task-table__empty", children: "\u52A0\u8F7D\u4E2D..." }) })) : taskRunsError ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "task-table__empty", children: taskRunsError }) })) : taskRuns.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "task-table__empty", children: "\u6682\u65E0\u6267\u884C\u8BB0\u5F55" }) })) : (taskRuns.map((run) => {
                                                    const statusClass = run.status === 'success' ? 'ok' : 'warning';
                                                    const statusLabel = run.status === 'success' ? '完成' : run.status === 'partial' ? '部分成功' : '失败';
                                                    return (_jsxs("tr", { children: [_jsx("td", { children: run.keywords.length ? run.keywords.join('、') : '未设置' }), _jsx("td", { children: formatPlatformList(run.platforms) }), _jsx("td", { children: formatRunTime(run.runAt) }), _jsxs("td", { children: [run.newItems, " \u6761"] }), _jsx("td", { children: _jsx("span", { className: `task-status task-status--${statusClass}`, children: statusLabel }) })] }, run.id));
                                                })) })] })] })] }), toast ? _jsx(Toast, { message: toast.message, type: toast.type }) : null] }), adminModalOpen ? (_jsx("div", { className: "admin-password-modal", children: _jsxs("form", { className: "admin-password-card", onSubmit: handleAdminPasswordSubmit, children: [_jsx("h3", { children: "\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u7801" }), _jsx("p", { className: "plan-meta", children: "\u5B8C\u6210\u9A8C\u8BC1\u540E\u5C06\u8FDB\u5165\u7BA1\u7406\u5E73\u53F0\u3002" }), _jsx("input", { type: "password", value: adminPasswordInput, onChange: (event) => setAdminPasswordInput(event.target.value), placeholder: "\u7BA1\u7406\u5458\u5BC6\u7801", autoFocus: true }), adminPasswordError ? _jsx("div", { className: "subscription-error", children: adminPasswordError }) : null, _jsxs("div", { className: "admin-password-card__actions", children: [_jsx("button", { type: "button", className: "btn secondary", onClick: () => setAdminModalOpen(false), children: "\u53D6\u6D88" }), _jsx("button", { type: "submit", className: "btn primary", children: "\u786E\u5B9A" })] })] }) })) : null] }));
}
