import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { MarketingFooter } from '../components/MarketingFooter';
import { MarketingNav } from '../components/MarketingNav';
import { useLanguage } from '../contexts/LanguageContext';
export function PaymentPreviewPage() {
    const { t, lang } = useLanguage();
    const TEXT = t({
        zh: {
            title: '试用后置支付流程 · 明确套餐 + 银行卡',
            desc: '试用用户可选择 14 天套餐并输入信用卡，试用结束自动扣款。',
            chooseTrial: '选择试用方案',
            trialBasic: '14 天基础试用',
            trialPro: '14 天进阶试用',
            addon: '可选增强包：并发运行 + 高速抓取',
            payMethod: '支付方式',
            card: '银行卡',
            paypal: 'PayPal',
            orderSummary: '订单摘要',
            freeTrial: '14 天标准试用 · 免费',
            nextBill: '下一次扣款：',
            confirm: '确认试用',
            refundTitle: '5 天退款保障',
            refundDesc: '如果不满意，可在试用后 5 天内发起退款。'
        },
        en: {
            title: 'Post-trial payment · pick plan + card',
            desc: 'Trial users choose a 14-day plan and add card; auto-charge after trial.',
            chooseTrial: 'Choose trial plan',
            trialBasic: '14-day basic trial',
            trialPro: '14-day pro trial',
            addon: 'Optional add-on: concurrency + fast fetching',
            payMethod: 'Payment method',
            card: 'Card',
            paypal: 'PayPal',
            orderSummary: 'Order summary',
            freeTrial: '14-day standard trial · Free',
            nextBill: 'Next charge: ',
            confirm: 'Confirm trial',
            refundTitle: '5-day refund guarantee',
            refundDesc: 'Unhappy? Request refund within 5 days after trial.'
        }
    });
    return (_jsxs(_Fragment, { children: [_jsx(MarketingNav, {}), _jsxs("section", { className: "section", children: [_jsxs("header", { children: [_jsx("h2", { children: TEXT.title }), _jsx("p", { children: TEXT.desc })] }), _jsxs("div", { className: "shell payment-grid", children: [_jsxs("div", { className: "card", children: [_jsx("h4", { children: TEXT.chooseTrial }), _jsxs("div", { className: "cta-row", style: { padding: '12px 0' }, children: [_jsx("button", { type: "button", className: "btn secondary", style: { flex: 1 }, children: TEXT.trialBasic }), _jsx("button", { type: "button", className: "btn", style: { flex: 1 }, children: TEXT.trialPro })] }), _jsxs("label", { style: { display: 'flex', gap: 12, alignItems: 'flex-start' }, children: [_jsx("input", { type: "checkbox", defaultChecked: true }), _jsx("span", { children: TEXT.addon })] }), _jsx("h4", { style: { marginTop: 24 }, children: TEXT.payMethod }), _jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsx("button", { type: "button", className: "btn secondary", style: { flex: 1 }, children: TEXT.card }), _jsx("button", { type: "button", className: "btn", style: { flex: 1 }, children: TEXT.paypal })] }), _jsxs("div", { style: { display: 'grid', gap: 12, marginTop: 12 }, children: [_jsx("input", { placeholder: "Card Number", style: { padding: 12, borderRadius: 12, border: '1px solid var(--border)' } }), _jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsx("input", { placeholder: "MM/YY", style: { flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border)' } }), _jsx("input", { placeholder: "CVV", style: { flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border)' } })] })] })] }), _jsxs("div", { className: "card", style: { alignSelf: 'stretch' }, children: [_jsx("h4", { children: TEXT.orderSummary }), _jsx("p", { children: TEXT.freeTrial }), _jsx("p", { children: "Max cloud nodes: 3" }), _jsxs("p", { children: [TEXT.nextBill, "2025-11-28"] }), _jsx("button", { type: "button", className: "btn primary", style: { width: '100%', marginTop: 16 }, children: TEXT.confirm }), _jsxs("div", { className: "card", style: { marginTop: 18, background: 'rgba(16, 185, 129, 0.12)', borderColor: 'transparent' }, children: [_jsx("strong", { children: TEXT.refundTitle }), _jsx("p", { children: TEXT.refundDesc })] })] })] })] }), _jsx(MarketingFooter, {})] }));
}
