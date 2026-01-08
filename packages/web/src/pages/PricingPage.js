import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { MarketingFooter } from '../components/MarketingFooter';
import { MarketingNav } from '../components/MarketingNav';
import { useLanguage } from '../contexts/LanguageContext';
export function PricingPage() {
    const { t, lang } = useLanguage();
    const TEXT = t({
        zh: {
            title: '会员订阅 · 直接选择套餐并支付',
            desc: '页面只保留月度 / 年度两档套餐，点击“订阅”即可跳转到控制台完成支付二维码。',
            subscribe: '订阅（跳转支付码）',
            badgeHot: '热门',
            badgeBest: '最划算',
            monthCycle: '/ 月',
            yearCycle: '/ 年',
            monthly: '月度会员',
            yearly: '年度会员',
            perk2: '2 个关键词',
            perkDaily2: '每日 2 个执行时间',
            perkNotify: '飞书 + 邮件通知',
            perkInstant: '支付后立即生效',
            perk10: '10 个关键词',
            perkDaily5: '每日 5 个执行时间',
            perkSave: '立省 17%，一次付清'
        },
        en: {
            title: 'Pricing · Choose and pay',
            desc: 'Monthly / Yearly plans only. Click “Subscribe” to open the payment QR in console.',
            subscribe: 'Subscribe (get QR)',
            badgeHot: 'Popular',
            badgeBest: 'Best value',
            monthCycle: '/ mo',
            yearCycle: '/ yr',
            monthly: 'Monthly plan',
            yearly: 'Yearly plan',
            perk2: '2 keywords',
            perkDaily2: '2 runs per day',
            perkNotify: 'Feishu + email notifications',
            perkInstant: 'Active right after payment',
            perk10: '10 keywords',
            perkDaily5: '5 runs per day',
            perkSave: 'Save 17% when paid yearly'
        }
    });
    const PLANS = [
        {
            code: 'MONTHLY_BASIC',
            title: TEXT.monthly,
            price: lang === 'zh' ? '¥99' : '¥99',
            cycle: TEXT.monthCycle,
            perks: [TEXT.perk2, TEXT.perkDaily2, TEXT.perkNotify, TEXT.perkInstant],
            badge: TEXT.badgeHot
        },
        {
            code: 'YEARLY_BASIC',
            title: TEXT.yearly,
            price: lang === 'zh' ? '¥999' : '¥999',
            cycle: TEXT.yearCycle,
            perks: [TEXT.perk10, TEXT.perkDaily5, TEXT.perkNotify, TEXT.perkSave],
            badge: TEXT.badgeBest
        }
    ];
    return (_jsxs(_Fragment, { children: [_jsx(MarketingNav, {}), _jsxs("section", { className: "section", children: [_jsxs("header", { children: [_jsx("h2", { children: TEXT.title }), _jsx("p", { children: TEXT.desc })] }), _jsx("div", { className: "shell pricing-grid", children: PLANS.map((plan) => (_jsxs("article", { className: "pricing-card highlight", children: [_jsx("div", { className: "pricing-card__badge", children: plan.badge }), _jsx("h4", { children: plan.title }), _jsxs("p", { className: "plan-price", children: [plan.price, _jsx("span", { className: "plan-cycle", children: plan.cycle })] }), _jsx("ul", { className: "plan-benefits", children: plan.perks.map((perk) => (_jsx("li", { children: perk }, perk))) }), _jsx("a", { className: "btn primary", style: { width: '100%', textAlign: 'center' }, href: "/app/subscription", children: TEXT.subscribe })] }, plan.code))) })] }), _jsx(MarketingFooter, {})] }));
}
