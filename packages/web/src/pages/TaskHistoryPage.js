import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TASK_RUN_HISTORY } from '../data/taskRuns';
import { formatMonthLabel, formatRunTime, monthKeyFromDate } from '../utils/date';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const USER_STATUS_LABEL = {
    trialing: '试用中',
    active: '已订阅',
    past_due: '待续费',
    canceled: '已取消'
};
export function TaskHistoryPage() {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const accountStatusLabel = useMemo(() => {
        if (!user)
            return null;
        return USER_STATUS_LABEL[user.status] ?? user.status;
    }, [user]);
    const trialInfo = useMemo(() => {
        if (!user?.trialEndsAt)
            return null;
        const endsAt = new Date(user.trialEndsAt);
        if (Number.isNaN(endsAt.getTime()))
            return null;
        const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
        return {
            message: diffDays > 0 ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）` : `试用已到期（${endsAt.toLocaleDateString()}）`
        };
    }, [user?.trialEndsAt]);
    const groupedRuns = useMemo(() => {
        const sorted = [...TASK_RUN_HISTORY].sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
        const map = new Map();
        sorted.forEach((run) => {
            const date = new Date(run.runAt);
            if (Number.isNaN(date.getTime())) {
                return;
            }
            const key = monthKeyFromDate(date);
            const list = map.get(key) ?? [];
            list.push(run);
            map.set(key, list);
        });
        return Array.from(map.entries())
            .map(([key, runs]) => ({
            key,
            label: formatMonthLabel(key),
            runs
        }))
            .sort((a, b) => (a.key < b.key ? 1 : -1));
    }, []);
    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await logout();
        }
        finally {
            setLogoutLoading(false);
            setMenuOpen(false);
        }
    };
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("header", { className: "dashboard-nav", children: [_jsxs(Link, { className: "logo-mark", to: "/", children: [_jsx("span", { children: "PI" }), "Product Insight"] }), _jsxs("div", { className: "dashboard-nav__actions", children: [_jsx("button", { type: "button", className: "btn text", children: "\u4E2D\u6587 \u25BE" }), _jsx("button", { type: "button", className: "dashboard-avatar", onClick: () => setMenuOpen((prev) => !prev), "aria-label": "\u6253\u5F00\u8D26\u53F7\u4FE1\u606F", children: (user?.email?.[0] ?? 'U').toUpperCase() }), menuOpen ? (_jsxs("div", { className: "account-popover account-popover--dashboard", children: [_jsx("div", { className: "account-popover__header", children: _jsx("strong", { children: user?.email ?? '未登录' }) }), accountStatusLabel ? (_jsxs("p", { className: "account-popover__status", children: ["\u8D26\u6237\u72B6\u6001\uFF1A", accountStatusLabel] })) : null, trialInfo ? _jsx("p", { className: "account-popover__status", children: trialInfo.message }) : null, _jsx("button", { type: "button", className: "btn secondary", onClick: () => void handleLogout(), disabled: logoutLoading, children: logoutLoading ? '退出中...' : '退出登录' })] })) : null] })] }), _jsx("main", { className: "dashboard-shell", children: _jsxs("article", { className: "dashboard-card dashboard-card--wide", children: [_jsxs("div", { className: "dashboard-card__header", children: [_jsxs("div", { children: [_jsx("h3", { children: "\u5168\u90E8\u4EFB\u52A1\u6267\u884C\u8BB0\u5F55" }), _jsx("p", { children: "\u6309\u6708\u4EFD\u5212\u5206\uFF0C\u5C55\u793A\u6240\u6709\u5B9A\u65F6\u4EFB\u52A1\u7684\u6267\u884C\u60C5\u51B5\u3002" })] }), _jsx(Link, { to: "/app", children: "\u8FD4\u56DE\u6982\u89C8" })] }), groupedRuns.length === 0 ? (_jsx("p", { style: { padding: '16px' }, children: "\u6682\u65E0\u6267\u884C\u8BB0\u5F55\u3002" })) : (groupedRuns.map((group) => (_jsxs("section", { className: "task-history-section", children: [_jsx("h4", { children: group.label }), _jsxs("table", { className: "task-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u5173\u952E\u8BCD" }), _jsx("th", { children: "\u5E73\u53F0" }), _jsx("th", { children: "\u6267\u884C\u65F6\u95F4" }), _jsx("th", { children: "\u65B0\u589E\u53CD\u9988" }), _jsx("th", { children: "\u72B6\u6001" })] }) }), _jsx("tbody", { children: group.runs.map((run) => (_jsxs("tr", { children: [_jsx("td", { children: run.keywords.join('、') }), _jsx("td", { children: run.platforms }), _jsx("td", { children: formatRunTime(run.runAt) }), _jsxs("td", { children: [run.newItems, " \u6761"] }), _jsx("td", { children: _jsx("span", { className: `task-status task-status--${run.status === 'success' ? 'ok' : 'warning'}`, children: run.status === 'success' ? '完成' : '失败' }) })] }, run.id))) })] })] }, group.key))))] }) })] }));
}
