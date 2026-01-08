import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { MarketingFooter } from '../components/MarketingFooter';
import { MarketingNav } from '../components/MarketingNav';
import { useLanguage } from '../contexts/LanguageContext';
const QUICK_MENU_ITEMS = ['account', 'security', 'billing', 'logout'];
export function DashboardPreviewPage() {
    const { t, lang } = useLanguage();
    const TEXT = t({
        zh: {
            title: '主控制台 · 会员状态 + 最近任务',
            desc: '登录后按照竞品的布局展示账户信息与导航。',
            sideNav: '侧边导航',
            welcome: '欢迎回来',
            plan: '当前套餐：年度会员 · 到期 2025/11/28',
            quota: '关键词额度 2/2 · 执行时间 2/2',
            recent: '最近任务列表 + 状态（完成/排队中）',
            quickTitle: '账号快捷菜单',
            quickDesc: '点击右上角头像弹出，展示当前套餐与常用入口。',
            changePlan: '更改套餐',
            quickMap: {
                account: '账号设置',
                security: '安全中心',
                billing: '优惠券 / 发票 / 信用额度',
                logout: '退出登录'
            }
        },
        en: {
            title: 'Dashboard preview · Plan & recent tasks',
            desc: 'Shows account info and navigation after login.',
            sideNav: 'Side navigation',
            welcome: 'Welcome back',
            plan: 'Current plan: Yearly · Expires 2025/11/28',
            quota: 'Keywords 2/2 · Schedule 2/2',
            recent: 'Recent tasks + status (done/queued)',
            quickTitle: 'Quick account menu',
            quickDesc: 'Opens from avatar, showing plan and shortcuts.',
            changePlan: 'Change plan',
            quickMap: {
                account: 'Account settings',
                security: 'Security',
                billing: 'Coupons / Invoice / Credit',
                logout: 'Logout'
            }
        }
    });
    return (_jsxs(_Fragment, { children: [_jsx(MarketingNav, {}), _jsxs("section", { className: "section", children: [_jsxs("header", { children: [_jsx("h2", { children: TEXT.title }), _jsx("p", { children: TEXT.desc })] }), _jsxs("div", { className: "shell dashboard-grid", children: [_jsxs("div", { className: "card", style: { background: '#f8fafc' }, children: [_jsx("h4", { children: TEXT.sideNav }), _jsxs("ul", { children: [_jsx("li", { children: "Overview" }), _jsx("li", { children: "Tasks & Datasets" }), _jsx("li", { children: "Templates" }), _jsx("li", { children: "Plans & Payment" }), _jsx("li", { children: "Account & Security" }), _jsx("li", { children: "Referral" })] })] }), _jsxs("div", { className: "card", children: [_jsx("h4", { children: TEXT.welcome }), _jsx("p", { children: TEXT.plan }), _jsx("p", { children: TEXT.quota }), _jsx("p", { children: TEXT.recent })] })] })] }), _jsx("section", { className: "section", children: _jsxs("div", { className: "shell", children: [_jsxs("header", { children: [_jsx("h2", { children: TEXT.quickTitle }), _jsx("p", { children: TEXT.quickDesc })] }), _jsxs("div", { className: "card", style: { maxWidth: 420, margin: '0 auto' }, children: [_jsx("strong", { children: "Roy_Duan" }), _jsx("p", { children: "duanhr.work@gmail.com" }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { children: lang === 'zh' ? '当前套餐：年度会员' : 'Current plan: Yearly' }), _jsx("button", { type: "button", className: "btn secondary", children: TEXT.changePlan })] }), _jsx("ul", { style: { marginTop: 18, listStyle: 'none', padding: 0, display: 'grid', gap: 8 }, children: QUICK_MENU_ITEMS.map((item) => {
                                        const label = TEXT.quickMap[item];
                                        return _jsx("li", { children: label }, item);
                                    }) })] })] }) }), _jsx(MarketingFooter, {})] }));
}
