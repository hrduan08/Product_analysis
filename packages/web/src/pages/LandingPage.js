import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { MarketingFooter } from '../components/MarketingFooter';
import { MarketingNav } from '../components/MarketingNav';
import { useAuth } from '../contexts/AuthContext';
const FEATURE_BUTTONS = [
    '跨平台关键词订阅 · 支持多收件人',
    '增量识别 + 模板化摘要邮件',
    '会员配额管理 & 自动续费提醒',
    '微信 / 支付宝 / Stripe 多渠道支付',
    '任务监控、失败重试与告警',
    '自助导出 CSV / API'
];
const USE_CASES = ['新兴产品口碑追踪', '品牌舆情与危机监控', '市场/竞品研究', '投研信息挖掘', '运营日报自动化', '内容创意灵感库'];
const RESOURCES = [
    { title: '入门指南', description: '5 分钟配置首个关键词，含截图与表单示例。' },
    { title: '开放 API 与 Webhook', description: '提供 Postman Collection、速查表与常见错误。' },
    { title: '采集合规与隐私', description: '展示数据处理协议、GDPR / CCPA 说明。' },
    { title: '客户故事 / 模板', description: '按行业分类的成功案例，可直接复制模板。' }
];
const FEATURE_BULLETS = [
    '关键词面板提示剩余额度，达到上限自动禁用按钮。',
    '摘要邮件预览包含播放量、评论数、跳转链接。',
    '会员卡片对齐支付页，告知到期日与升级入口。'
];
export function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const handleStartTrial = () => {
        if (user) {
            navigate('/app');
            return;
        }
        navigate('/register');
    };
    return (_jsxs(_Fragment, { children: [_jsx(MarketingNav, {}), _jsx("section", { className: "hero", children: _jsxs("div", { className: "shell hero-grid", children: [_jsxs("div", { children: [_jsx("h1", { children: "\u6D1E\u5BDF\u5168\u7403\u7528\u6237\u58F0\u97F3\uFF0C\u7528 7 \u5929\u6784\u5EFA\u53EF\u8BA2\u9605\u7684\u4EA7\u54C1\u60C5\u62A5\u5E73\u53F0" }), _jsx("p", { children: "Product Insight \u805A\u5408 YouTube\u3001Reddit \u7B49\u6E20\u9053\u53CD\u9988\uFF0C\u81EA\u52A8\u63D0\u70BC\u70ED\u70B9\u3001\u751F\u6210\u90AE\u4EF6\u5361\u7247\uFF0C\u5E76\u8054\u52A8\u4F1A\u5458\u8BA2\u9605\u7CFB\u7EDF\u5B8C\u6210\u4ED8\u8D39\u8F6C\u5316\u3002" }), _jsxs("div", { className: "cta-row", children: [_jsx("button", { type: "button", className: "btn primary", onClick: handleStartTrial, children: "\u514D\u8D39\u8BD5\u7528" }), _jsx("button", { type: "button", className: "btn", onClick: () => navigate(user ? '/app' : '/login'), children: "\u89C2\u770B\u6F14\u793A" })] })] }), _jsxs("div", { className: "hero-panel", style: { maxWidth: 600, textAlign: 'left' }, children: [_jsx("img", { src: "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1100&q=70", alt: "Product Insight" }), _jsx("p", { style: { fontSize: 14, color: 'var(--muted)', margin: 0, textAlign: 'center' }, children: "\u5C55\u793A\u641C\u7D22\u914D\u7F6E\u548C\u589E\u91CF\u90AE\u4EF6\u5361\u7247\uFF0C\u7A81\u51FA\u771F\u5B9E\u4F7F\u7528\u573A\u666F\u3002" })] })] }) }), _jsxs("section", { className: "section", id: "features", children: [_jsxs("header", { children: [_jsx("h2", { children: "\u4E00\u4E2A\u5BB9\u5668\u5373\u53EF\u6D4F\u89C8\u6240\u6709\u5173\u952E\u529F\u80FD" }), _jsx("p", { children: "\u53C2\u8003\u4E3B\u6D41 SaaS \u4EA4\u4E92\uFF0C\u5C06\u6838\u5FC3\u4EAE\u70B9\u96C6\u4E2D\u5728\u53EF\u6EDA\u52A8\u7684\u529F\u80FD\u5BB9\u5668\u4E2D\uFF0C\u5DE6\u4FA7\u6309\u94AE\u7528\u4E8E\u5FEB\u901F\u5B9A\u4F4D\uFF0C\u53F3\u4FA7\u5C55\u793A\u5B9E\u65F6\u793A\u610F\u3002" })] }), _jsxs("div", { className: "shell feature-wrapper", children: [_jsx("div", { className: "feature-list", children: FEATURE_BUTTONS.map((feature) => (_jsx("div", { className: "feature-button", children: feature }, feature))) }), _jsxs("div", { className: "feature-canvas", children: [_jsx("h3", { children: "\u5B9E\u65F6\u793A\u610F\uFF1A\u914D\u7F6E \u2192 \u63A8\u9001 \u2192 \u4ED8\u8D39" }), _jsx("p", { children: "\u7528\u6237\u5728\u540C\u4E00\u4E2A\u5BB9\u5668\u91CC\u5B8C\u6210\u914D\u7F6E\u3001\u67E5\u770B\u63A8\u9001\u6837\u4F8B\u3001\u5E76\u4E86\u89E3\u4ED8\u8D39\u6743\u76CA\u3002\u5BB9\u5668\u652F\u6301\u4E0A\u4E0B\u6EDA\u52A8\uFF0C\u9010\u6761\u6D4F\u89C8\u5177\u4F53\u529F\u80FD\u70B9\u3002" }), _jsx("ul", { children: FEATURE_BULLETS.map((item) => (_jsx("li", { children: item }, item))) }), _jsx("p", { style: { color: 'var(--muted)' }, children: "\u4EA4\u4E92\uFF1A\u6EDA\u52A8\u5BB9\u5668\u3001Hover \u5361\u7247\u3001\u5728\u79FB\u52A8\u7AEF\u81EA\u52A8\u5806\u53E0\u3002" })] })] })] }), _jsxs("section", { className: "section", id: "usecases", children: [_jsxs("header", { children: [_jsx("h2", { children: "\u5E94\u7528\u573A\u666F \u00B7 \u51E0\u4E4E\u8986\u76D6\u6240\u6709\u884C\u4E1A" }), _jsx("p", { children: "\u7528\u6848\u4F8B\u6765\u8BB2\u6545\u4E8B\uFF0C\u8BA9\u8BBF\u5BA2\u5FEB\u901F\u5339\u914D\u81EA\u8EAB\u4E1A\u52A1\u3002" })] }), _jsx("div", { className: "shell use-cases", children: USE_CASES.map((item) => (_jsx("div", { className: "use-case", children: item }, item))) })] }), _jsxs("section", { className: "section", id: "resources", children: [_jsxs("header", { children: [_jsx("h2", { children: "\u8D44\u6E90\u4E2D\u5FC3 & \u6211\u4EEC\u5982\u4F55\u5E2E\u52A9\u4F60\u4E0A\u624B" }), _jsx("p", { children: "\u501F\u9274\u7ADE\u54C1\u201C\u5E2E\u52A9\u4FE1\u606F\u201D\u5E03\u5C40\uFF0C\u63D0\u4F9B\u591A\u7EF4\u5EA6\u6307\u5357\u3002" })] }), _jsx("div", { className: "shell resource-grid", children: RESOURCES.map((resource) => (_jsxs("article", { className: "resource", children: [_jsx("h4", { children: resource.title }), _jsx("p", { children: resource.description })] }, resource.title))) })] }), _jsx("section", { className: "section", id: "cta", children: _jsxs("div", { className: "shell cta-banner", children: [_jsx("h2", { style: { marginBottom: 12 }, children: "\u7ACB\u5373\u6CE8\u518C\uFF0C\u89E3\u9501 7 \u5929\u6B63\u5F0F\u4F1A\u5458\u4F53\u9A8C" }), _jsx("p", { style: { marginBottom: 24 }, children: "\u65E0\u9700\u4FE1\u7528\u5361\u5373\u53EF\u5F00\u59CB\uFF1B\u5982\u679C\u9700\u8981\u63D0\u524D\u914D\u7F6E\u652F\u4ED8\u65B9\u5F0F\uFF0C\u4E5F\u63D0\u4F9B\u5361\u53F7\u9884\u6388\u6743\u6D41\u7A0B\u3002" }), _jsxs("div", { className: "cta-row", style: { justifyContent: 'center' }, children: [_jsx("button", { type: "button", className: "btn primary", onClick: handleStartTrial, children: "\u6CE8\u518C\u5E76\u4F53\u9A8C" }), _jsx("button", { type: "button", className: "btn", children: "\u4E0B\u8F7D\u6F14\u793A\u6570\u636E" })] })] }) }), _jsx(MarketingFooter, {})] }));
}
