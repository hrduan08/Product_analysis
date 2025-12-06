import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { TASK_RUN_HISTORY } from '../data/taskRuns';
import { formatRunTime } from '../utils/date';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_TOKEN ?? '';
const USER_STATUS_LABEL = {
    trialing: '试用中',
    active: '已订阅',
    past_due: '待续费',
    canceled: '已取消'
};
export function SearchPage() {
    const { user, logout } = useAuth();
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
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        window.setTimeout(() => setToast(null), 2400);
    };
    const trialInfo = useMemo(() => {
        if (!user || !user.trialEndsAt) {
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
    const planCtaLabel = user?.status === 'trialing' || !user ? '订阅会员' : '续费';
    const bannerVariant = trialInfo?.variant ?? 'info';
    const showVerifyWarning = Boolean(user && !user.emailVerified);
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
    const searchConfigs = [
        {
            id: 'task-1',
            name: 'AI 手环情绪监控',
            keywords: 'smart band, 情绪检测',
            schedule: '每天 09:00',
            platforms: 'YouTube + Reddit'
        },
        {
            id: 'task-2',
            name: 'Vision Pro 开箱体验',
            keywords: 'vision pro unboxing',
            schedule: '每天 08:30',
            platforms: 'YouTube'
        },
        {
            id: 'task-3',
            name: 'Reddit 客服声量',
            keywords: 'refund policy',
            schedule: '每天 22:00',
            platforms: 'Reddit'
        }
    ];
    const taskRuns = useMemo(() => [...TASK_RUN_HISTORY].sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime()), []);
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("header", { className: "dashboard-nav", children: [_jsxs(Link, { className: "logo-mark", to: "/", children: [_jsx("span", { children: "PI" }), "Product Insight"] }), _jsxs("div", { className: "dashboard-nav__actions", children: [_jsx("button", { type: "button", className: "btn text", children: "\u4E2D\u6587 \u25BE" }), _jsx("button", { type: "button", className: "dashboard-avatar", onClick: handleAvatarClick, "aria-label": "\u6253\u5F00\u8D26\u53F7\u4FE1\u606F", children: (user?.email?.[0] ?? 'U').toUpperCase() }), menuOpen ? (_jsxs("div", { className: "account-popover account-popover--dashboard", children: [_jsx("div", { className: "account-popover__header", children: _jsx("strong", { children: user?.email ?? '未登录' }) }), accountStatusLabel ? (_jsxs("p", { className: "account-popover__status", children: ["\u8D26\u6237\u72B6\u6001\uFF1A", accountStatusLabel] })) : null, trialInfo ? _jsx("p", { className: "account-popover__status", children: trialInfo.message }) : null, _jsx("button", { type: "button", className: "btn secondary", onClick: handleLogout, disabled: logoutLoading, children: logoutLoading ? '退出中...' : '退出登录' })] })) : null] })] }), _jsxs("main", { className: "dashboard-shell", children: [_jsxs("section", { className: `account-banner account-banner--${bannerVariant}`, children: [_jsxs("div", { children: [_jsxs("h2", { children: ["\u6B22\u8FCE\u56DE\u6765\uFF0C", user?.profile?.nickname ?? '成员'] }), _jsx("p", { children: "\u5F53\u524D\u8BD5\u7528\u8FD8\u5269 5 \u5929\uFF0C2 / 5 \u4E2A\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C\uFF0C\u6458\u8981\u6BCF\u5929 10:00 \u63A8\u9001\u3002" })] }), showVerifyWarning ? (_jsxs("div", { className: "account-banner__warning", children: ["\u90AE\u7BB1\u5C1A\u672A\u9A8C\u8BC1\uFF0C", _jsx(Link, { to: "/verify-email", children: "\u524D\u5F80\u9A8C\u8BC1" }), " \u540E\u65B9\u53EF\u521B\u5EFA\u8BA2\u9605\u3002"] })) : null] }), _jsxs("div", { className: "dashboard-grid", children: [_jsxs("article", { className: "dashboard-card dashboard-card--plan", children: [_jsx("div", { className: "dashboard-card__header", children: _jsx("h3", { children: "\u6211\u7684\u8BA2\u9605" }) }), _jsx("p", { className: "dashboard-card__value", children: "Standard \u00B7 \u00A599/\u5E74" }), _jsxs("ul", { className: "dashboard-card__list", children: [_jsx("li", { children: trialInfo ? trialInfo.message : '当前权益：标准版' }), _jsx("li", { children: "\u5305\u542B 5 \u4E2A\u5B9A\u65F6\u4EFB\u52A1 + 2 \u4E2A\u6E20\u9053" }), _jsx("li", { children: "\u4E0B\u4E00\u6B21\u6263\u6B3E\uFF1A2025/11/27" })] }), _jsx(Link, { to: "/app/subscription", className: "btn secondary", style: { width: '100%', textAlign: 'center' }, children: planCtaLabel })] }), _jsxs("article", { className: "dashboard-card", children: [_jsx("div", { className: "dashboard-card__header", children: _jsx("h3", { children: "\u641C\u7D22\u914D\u7F6E" }) }), _jsx("ul", { className: "dashboard-card__list", children: searchConfigs.map((config) => (_jsxs("li", { children: [config.name, " \u00B7 ", config.platforms, _jsx("br", {}), _jsx("span", { children: config.keywords }), _jsx("br", {}), _jsx("span", { children: config.schedule })] }, config.id))) }), _jsx(Link, { to: "/app/search-config", className: "btn secondary", style: { width: '100%' }, children: "\u4FEE\u6539\u641C\u7D22\u914D\u7F6E" })] }), _jsxs("article", { className: "dashboard-card dashboard-card--wide", children: [_jsxs("div", { className: "dashboard-card__header", children: [_jsx("h3", { children: "\u5B9A\u65F6\u4EFB\u52A1\u6267\u884C\u8BB0\u5F55" }), _jsx(Link, { to: "/app/task-history", children: "\u67E5\u770B\u5168\u90E8\u4EFB\u52A1" })] }), _jsxs("table", { className: "task-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u5173\u952E\u8BCD" }), _jsx("th", { children: "\u5E73\u53F0" }), _jsx("th", { children: "\u6700\u8FD1\u8FD0\u884C" }), _jsx("th", { children: "\u65B0\u589E\u53CD\u9988" }), _jsx("th", { children: "\u72B6\u6001" })] }) }), _jsx("tbody", { children: taskRuns.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "task-table__empty", children: "\u6682\u65E0\u6267\u884C\u8BB0\u5F55" }) })) : (taskRuns.map((run) => {
                                                    const statusClass = run.status === 'success' ? 'ok' : 'warning';
                                                    const statusLabel = run.status === 'success' ? '完成' : '失败';
                                                    return (_jsxs("tr", { children: [_jsx("td", { children: run.keywords.join('、') }), _jsx("td", { children: run.platforms }), _jsx("td", { children: formatRunTime(run.runAt) }), _jsxs("td", { children: [run.newItems, " \u6761"] }), _jsx("td", { children: _jsx("span", { className: `task-status task-status--${statusClass}`, children: statusLabel }) })] }, run.id));
                                                })) })] })] })] }), toast ? _jsx(Toast, { message: toast.message, type: toast.type }) : null] }), adminModalOpen ? (_jsx("div", { className: "admin-password-modal", children: _jsxs("form", { className: "admin-password-card", onSubmit: handleAdminPasswordSubmit, children: [_jsx("h3", { children: "\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u7801" }), _jsx("p", { className: "plan-meta", children: "\u5B8C\u6210\u9A8C\u8BC1\u540E\u5C06\u8FDB\u5165\u7BA1\u7406\u5E73\u53F0\u3002" }), _jsx("input", { type: "password", value: adminPasswordInput, onChange: (event) => setAdminPasswordInput(event.target.value), placeholder: "\u7BA1\u7406\u5458\u5BC6\u7801", autoFocus: true }), adminPasswordError ? _jsx("div", { className: "subscription-error", children: adminPasswordError }) : null, _jsxs("div", { className: "admin-password-card__actions", children: [_jsx("button", { type: "button", className: "btn secondary", onClick: () => setAdminModalOpen(false), children: "\u53D6\u6D88" }), _jsx("button", { type: "submit", className: "btn primary", children: "\u786E\u5B9A" })] })] }) })) : null] }));
}
