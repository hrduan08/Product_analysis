import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchTaskHistory } from '../services/taskHistory';
import { formatMonthLabel, formatRunTime, monthKeyFromDate } from '../utils/date';
import { formatPlatformList } from '../utils/platform';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const USER_STATUS_LABEL = {
    trialing: '试用中',
    active: '已订阅',
    past_due: '待续费',
    canceled: '已取消'
};
export function TaskHistoryPage() {
    const { user, logout } = useAuth();
    const { lang, setLang, t } = useLanguage();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [runs, setRuns] = useState([]);
    const [runsLoading, setRunsLoading] = useState(false);
    const [runsError, setRunsError] = useState(null);
    const avatarRef = useRef(null);
    const langRef = useRef(null);
    const [langOpen, setLangOpen] = useState(false);
    const TEXT = t({
        zh: {
            nav: { language: '语言', zh: '中文', en: 'English', open: '打开账号信息', logout: '退出登录', loggingOut: '退出中...', status: '账户状态：' },
            title: '全部任务执行记录',
            desc: '按月份划分，展示所有定时任务的执行情况。',
            back: '返回概览',
            loading: '加载中...',
            empty: '暂无执行记录。',
            table: { keywords: '关键词', platform: '平台', runAt: '执行时间', new: '新增反馈', status: '状态' }
        },
        en: {
            nav: { language: 'Language', zh: 'Chinese', en: 'English', open: 'Open account', logout: 'Log out', loggingOut: 'Logging out...', status: 'Status: ' },
            title: 'All scheduled task runs',
            desc: 'Grouped by month, showing all scheduled task executions.',
            back: 'Back to overview',
            loading: 'Loading...',
            empty: 'No records yet.',
            table: { keywords: 'Keywords', platform: 'Platform', runAt: 'Run at', new: 'New feedback', status: 'Status' }
        }
    });
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
        return {
            message: diffDays > 0 ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）` : `试用已到期（${endsAt.toLocaleDateString()}）`
        };
    }, [user?.trialEndsAt]);
    useEffect(() => {
        if (!user?.id) {
            setRuns([]);
            return;
        }
        let cancelled = false;
        setRunsLoading(true);
        setRunsError(null);
        void fetchTaskHistory({ userId: user.id, limit: 120 })
            .then((data) => {
            if (!cancelled) {
                setRuns(data);
            }
        })
            .catch((error) => {
            if (!cancelled) {
                setRunsError(error instanceof Error ? error.message : '加载执行记录失败');
            }
        })
            .finally(() => {
            if (!cancelled) {
                setRunsLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [user?.id]);
    const groupedRuns = useMemo(() => {
        const sorted = [...runs].sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
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
            .map(([key, list]) => ({
            key,
            label: formatMonthLabel(key),
            runs: list
        }))
            .sort((a, b) => (a.key < b.key ? 1 : -1));
    }, [runs]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (avatarRef.current && !avatarRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    useEffect(() => {
        if (!langOpen)
            return;
        const handleLangClickOutside = (event) => {
            if (langRef.current && !langRef.current.contains(event.target)) {
                setLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleLangClickOutside);
        return () => document.removeEventListener('mousedown', handleLangClickOutside);
    }, [langOpen]);
    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            await logout();
            navigate('/');
        }
        finally {
            setLogoutLoading(false);
            setMenuOpen(false);
        }
    };
    if (!user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("header", { className: "dashboard-nav", children: [_jsxs(Link, { className: "logo-mark", to: "/", children: [_jsx("img", { src: "/assets/logos/logo.png", alt: "VoiceInsight", className: "logo-img" }), _jsxs("span", { className: "logo-word", children: ["Voice", _jsx("span", { className: "logo-word__accent", children: "Insight" })] })] }), _jsxs("div", { className: "dashboard-nav__actions", ref: avatarRef, children: [_jsxs("div", { className: "nav-lang", ref: langRef, children: [_jsx("button", { type: "button", className: "btn text", onClick: () => setLangOpen((v) => !v), children: TEXT.nav.language }), langOpen ? (_jsxs("div", { className: "nav-lang__menu", children: [_jsx("button", { type: "button", className: `nav-lang__item${lang === 'zh' ? ' is-active' : ''}`, onClick: () => {
                                                    setLang('zh');
                                                    setLangOpen(false);
                                                }, children: TEXT.nav.zh }), _jsx("button", { type: "button", className: `nav-lang__item${lang === 'en' ? ' is-active' : ''}`, onClick: () => {
                                                    setLang('en');
                                                    setLangOpen(false);
                                                }, children: TEXT.nav.en })] })) : null] }), _jsx("button", { type: "button", className: "dashboard-avatar", onClick: () => setMenuOpen((prev) => !prev), "aria-label": TEXT.nav.open, children: (user?.email?.[0] ?? 'U').toUpperCase() }), menuOpen ? (_jsxs("div", { className: "account-popover account-popover--dashboard", children: [_jsx("div", { className: "account-popover__header", children: _jsx("strong", { children: user?.email ?? TEXT.nav.status }) }), accountStatusLabel ? (_jsxs("p", { className: "account-popover__status", children: [TEXT.nav.status, accountStatusLabel] })) : null, trialInfo ? _jsx("p", { className: "account-popover__status", children: trialInfo.message }) : null, _jsx("button", { type: "button", className: "btn secondary", onClick: () => void handleLogout(), disabled: logoutLoading, children: logoutLoading ? TEXT.nav.loggingOut : TEXT.nav.logout })] })) : null] })] }), _jsx("main", { className: "dashboard-shell", children: _jsxs("article", { className: "dashboard-card dashboard-card--wide", children: [_jsxs("div", { className: "dashboard-card__header", children: [_jsxs("div", { children: [_jsx("h3", { children: TEXT.title }), _jsx("p", { children: TEXT.desc })] }), _jsx(Link, { to: "/app", children: TEXT.back })] }), runsLoading ? (_jsx("p", { style: { padding: '16px' }, children: TEXT.loading })) : runsError ? (_jsx("p", { style: { padding: '16px' }, children: runsError })) : groupedRuns.length === 0 ? (_jsx("p", { style: { padding: '16px' }, children: TEXT.empty })) : (groupedRuns.map((group) => (_jsxs("section", { className: "task-history-section", children: [_jsx("h4", { children: formatMonthLabel(group.key, lang) }), _jsxs("table", { className: "task-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: TEXT.table.keywords }), _jsx("th", { children: TEXT.table.platform }), _jsx("th", { children: TEXT.table.runAt }), _jsx("th", { children: TEXT.table.new }), _jsx("th", { children: TEXT.table.status })] }) }), _jsx("tbody", { children: group.runs.map((run) => {
                                                const statusClass = run.status === 'success' ? 'ok' : 'warning';
                                                const statusLabel = run.status === 'success'
                                                    ? (lang === 'zh' ? '完成' : 'Success')
                                                    : run.status === 'partial'
                                                        ? (lang === 'zh' ? '部分成功' : 'Partial')
                                                        : (lang === 'zh' ? '失败' : 'Failed');
                                                return (_jsxs("tr", { children: [_jsx("td", { children: run.keywords.join(lang === 'zh' ? '、' : ', ') }), _jsx("td", { children: formatPlatformList(run.platforms) }), _jsx("td", { children: formatRunTime(run.runAt, lang) }), _jsx("td", { children: lang === 'zh' ? `${run.newItems} 条` : `${run.newItems}` }), _jsx("td", { children: _jsx("span", { className: `task-status task-status--${statusClass}`, children: statusLabel }) })] }, run.id));
                                            }) })] })] }, group.key))))] }) })] }));
}
