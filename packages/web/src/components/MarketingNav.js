import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
const USER_STATUS_LABEL = {
    trialing: '试用中',
    active: '已订阅',
    past_due: '待续费',
    canceled: '已取消'
};
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export function MarketingNav() {
    const { user, logout } = useAuth();
    const { lang, setLang } = useLanguage();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const navText = lang === 'zh'
        ? { login: '登录', register: '注册', dashboard: '控制台', langLabel: '语言', zh: '中文', en: 'English' }
        : { login: 'Log in', register: 'Sign up', dashboard: 'Dashboard', langLabel: 'Language', zh: 'Chinese', en: 'English' };
    const accountStatusLabel = useMemo(() => {
        if (!user)
            return null;
        return USER_STATUS_LABEL[user.status] ?? user.status;
    }, [user]);
    const trialInfo = useMemo(() => {
        if (!user || user.status !== 'trialing' || !user.trialEndsAt) {
            return null;
        }
        const endsAt = new Date(user.trialEndsAt);
        if (Number.isNaN(endsAt.getTime())) {
            return null;
        }
        const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
        return diffDays > 0 ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）` : `试用已到期（${endsAt.toLocaleDateString()}）`;
    }, [user]);
    const handleStartTrial = () => {
        if (user) {
            navigate('/app');
            return;
        }
        navigate('/register');
    };
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
    return (_jsx("div", { className: "nav-bar", children: _jsxs("div", { className: "shell nav-inner", children: [_jsx("div", { className: "nav-left", children: _jsxs(Link, { className: "logo-mark", to: "/", children: [_jsx("img", { src: "/assets/logos/logo.png", alt: "VoiceInsight", className: "logo-img" }), _jsxs("span", { className: "logo-word", children: ["Voice", _jsx("span", { className: "logo-word__accent", children: "Insight" })] })] }) }), _jsxs("div", { className: "nav-actions", children: [_jsxs("div", { className: "nav-lang", children: [_jsx("button", { type: "button", className: "btn text", onClick: () => setLangOpen((v) => !v), children: navText.langLabel }), langOpen ? (_jsxs("div", { className: "nav-lang__menu", children: [_jsx("button", { type: "button", className: `nav-lang__item${lang === 'zh' ? ' is-active' : ''}`, onClick: () => {
                                                setLang('zh');
                                                setLangOpen(false);
                                            }, children: navText.zh }), _jsx("button", { type: "button", className: `nav-lang__item${lang === 'en' ? ' is-active' : ''}`, onClick: () => {
                                                setLang('en');
                                                setLangOpen(false);
                                            }, children: navText.en })] })) : null] }), user ? (_jsxs(_Fragment, { children: [_jsx(Link, { className: "btn", to: "/app", children: navText.dashboard }), _jsxs("div", { className: "nav-avatar-wrapper", children: [_jsx("button", { type: "button", className: "dashboard-avatar", onClick: () => setMenuOpen((prev) => !prev), "aria-label": "\u6253\u5F00\u8D26\u53F7\u5165\u53E3", children: (user.email?.[0] ?? 'U').toUpperCase() }), menuOpen ? (_jsxs("div", { className: "account-popover account-popover--nav", children: [_jsx("div", { className: "account-popover__header", children: _jsx("strong", { children: user.email }) }), accountStatusLabel ? (_jsxs("p", { className: "account-popover__status", children: ["\u8D26\u6237\u72B6\u6001\uFF1A", accountStatusLabel] })) : null, trialInfo ? _jsx("p", { className: "account-popover__status", children: trialInfo }) : null, _jsx("button", { type: "button", className: "btn secondary", onClick: handleLogout, disabled: logoutLoading, children: logoutLoading ? '退出中...' : '退出登录' })] })) : null] })] })) : (_jsxs(_Fragment, { children: [_jsx(Link, { className: "btn", to: "/login", children: navText.login }), _jsx("button", { type: "button", className: "btn primary", onClick: handleStartTrial, children: navText.register })] }))] })] }) }));
}
