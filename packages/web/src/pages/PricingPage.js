import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { MarketingFooter } from '../components/MarketingFooter';
import { MarketingNav } from '../components/MarketingNav';
const PLANS = [
    {
        code: 'MONTHLY_BASIC',
        title: '月度会员',
        price: '¥99',
        cycle: '/ 月',
        perks: ['2 个关键词', '每日 2 个执行时间', '飞书 + 邮件通知', '支付后立即生效'],
        badge: '热门'
    },
    {
        code: 'YEARLY_BASIC',
        title: '年度会员',
        price: '¥999',
        cycle: '/ 年',
        perks: ['10 个关键词', '每日 5 个执行时间', '飞书 + 邮件通知', '立省 17%，一次付清'],
        badge: '最划算'
    }
];
export function PricingPage() {
    return (_jsxs(_Fragment, { children: [_jsx(MarketingNav, {}), _jsxs("section", { className: "section", children: [_jsxs("header", { children: [_jsx("h2", { children: "\u4F1A\u5458\u8BA2\u9605 \u00B7 \u76F4\u63A5\u9009\u62E9\u5957\u9910\u5E76\u652F\u4ED8" }), _jsx("p", { children: "\u9875\u9762\u53EA\u4FDD\u7559\u6708\u5EA6 / \u5E74\u5EA6\u4E24\u6863\u5957\u9910\uFF0C\u70B9\u51FB\u201C\u8BA2\u9605\u201D\u5373\u53EF\u8DF3\u8F6C\u5230\u63A7\u5236\u53F0\u5B8C\u6210\u652F\u4ED8\u4E8C\u7EF4\u7801\u3002" })] }), _jsx("div", { className: "shell pricing-grid", children: PLANS.map((plan) => (_jsxs("article", { className: "pricing-card highlight", children: [_jsx("div", { className: "pricing-card__badge", children: plan.badge }), _jsx("h4", { children: plan.title }), _jsxs("p", { className: "plan-price", children: [plan.price, _jsx("span", { className: "plan-cycle", children: plan.cycle })] }), _jsx("ul", { className: "plan-benefits", children: plan.perks.map((perk) => (_jsx("li", { children: perk }, perk))) }), _jsx("a", { className: "btn primary", style: { width: '100%', textAlign: 'center' }, href: "/app/subscription", children: "\u8BA2\u9605\uFF08\u8DF3\u8F6C\u652F\u4ED8\u7801\uFF09" })] }, plan.code))) })] }), _jsx(MarketingFooter, {})] }));
}
