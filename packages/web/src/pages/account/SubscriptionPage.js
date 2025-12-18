import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createSubscriptionRequest, fetchPlans, fetchSubscription } from '../../services/billing';
import { createPaymentCheckout, fetchPaymentProviders, fetchPaymentStatus } from '../../services/payment';
const sharedBenefits = ['最多可设置 2 个监控关键词', '每天定时监控 2 次', '飞书 + 邮件通知监控结果'];
const planBenefitMap = {
    MONTHLY_BASIC: {
        title: '月度会员',
        benefits: sharedBenefits
    },
    YEARLY_BASIC: {
        title: '年度会员',
        benefits: [...sharedBenefits, '全年一次付清，立省 17%']
    }
};
const allowedPlanCodes = new Set(['MONTHLY_BASIC', 'YEARLY_BASIC']);
const formatAmount = (cents) => `¥${(cents / 100).toFixed(2)}`;
const getPlanTitle = (plan) => planBenefitMap[plan.code]?.title ?? plan.name;
const getPlanBenefits = (plan) => planBenefitMap[plan.code]?.benefits ?? sharedBenefits;
export function SubscriptionPage() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState('idle');
    const [error, setError] = useState(null);
    const [providerStatus, setProviderStatus] = useState([]);
    const [providerStatusError, setProviderStatusError] = useState(null);
    const [checkoutPlan, setCheckoutPlan] = useState(null);
    const [checkoutInfo, setCheckoutInfo] = useState(null);
    const [checkoutError, setCheckoutError] = useState(null);
    const [actionState, setActionState] = useState('idle');
    const [pendingPlanCode, setPendingPlanCode] = useState(null);
    const pollingRef = useRef(null);
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                window.clearInterval(pollingRef.current);
            }
        };
    }, []);
    const loadSubscriptionData = async () => {
        if (!user)
            return;
        setLoading('loading');
        try {
            const [planList, subscriptionResult] = await Promise.all([fetchPlans(), fetchSubscription(user.id)]);
            setPlans(planList);
            setSubscription(subscriptionResult.subscription);
            const expireAt = subscriptionResult.subscription?.current_period_end ?? subscriptionResult.user.planExpireAt ?? null;
            updateUser({
                ...user,
                status: subscriptionResult.user.status,
                trialStartedAt: subscriptionResult.user.trialStartedAt,
                trialEndsAt: subscriptionResult.user.trialEndsAt,
                planExpireAt: expireAt,
                planId: subscriptionResult.plan?.id ?? subscriptionResult.subscription?.plan_id ?? null
            });
            setError(null);
            setLoading('success');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '加载失败，请稍后再试');
            setLoading('error');
        }
    };
    const loadProviderStatus = async () => {
        try {
            const providers = await fetchPaymentProviders();
            setProviderStatus(providers);
            setProviderStatusError(null);
        }
        catch (err) {
            setProviderStatus([]);
            setProviderStatusError(err instanceof Error ? err.message : '获取支付方式失败');
        }
    };
    useEffect(() => {
        if (!user)
            return;
        void loadSubscriptionData();
    }, [user]);
    useEffect(() => {
        void loadProviderStatus();
    }, []);
    const paidPlans = useMemo(() => {
        return plans.filter((plan) => allowedPlanCodes.has(plan.code));
    }, [plans]);
    const currentPlanCode = useMemo(() => {
        if (!subscription)
            return null;
        if (subscription.plan) {
            return subscription.plan.code;
        }
        if (subscription.plan_id) {
            return plans.find((plan) => plan.id === subscription.plan_id)?.code ?? null;
        }
        return null;
    }, [plans, subscription]);
    const providerStatusLoading = providerStatus.length === 0 && !providerStatusError;
    const enabledProviders = providerStatus.filter((item) => item.enabled).map((item) => item.provider);
    const noRealProvider = providerStatus.length > 0 && enabledProviders.length === 0;
    const personalOnlyProvider = enabledProviders.includes('wechat_personal') && !enabledProviders.some((provider) => provider === 'wechat' || provider === 'alipay');
    const resolveProvider = () => {
        if (enabledProviders.includes('wechat'))
            return 'wechat';
        if (enabledProviders.includes('alipay'))
            return 'alipay';
        if (enabledProviders.includes('wechat_personal'))
            return 'wechat_personal';
        return 'mock';
    };
    const stopCheckout = () => {
        if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setCheckoutPlan(null);
        setCheckoutInfo(null);
        setCheckoutError(null);
    };
    const startPolling = (orderId) => {
        if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
        }
        pollingRef.current = window.setInterval(async () => {
            try {
                const status = await fetchPaymentStatus(orderId);
                setCheckoutInfo((prev) => (prev ? { ...prev, status: status.status } : prev));
                if (status.status === 'paid') {
                    stopCheckout();
                    await loadSubscriptionData();
                }
                else if (['failed', 'canceled', 'expired'].includes(status.status)) {
                    setCheckoutError(status.status === 'failed' ? '支付失败，请重新扫码' : status.status === 'canceled' ? '订单已取消' : '订单已过期');
                    if (pollingRef.current) {
                        window.clearInterval(pollingRef.current);
                        pollingRef.current = null;
                    }
                }
            }
            catch (err) {
                setCheckoutError(err instanceof Error ? err.message : '查询支付状态失败');
            }
        }, 3000);
    };
    const handleCheckout = async (plan, provider) => {
        if (!user) {
            navigate('/login');
            return;
        }
        setActionState('loading');
        setCheckoutError(null);
        try {
            const result = await createPaymentCheckout({ userId: user.id, planCode: plan.code, provider });
            setCheckoutPlan(plan);
            setCheckoutInfo(result);
            setActionState('idle');
            if (result.status === 'paid') {
                await loadSubscriptionData();
            }
            else {
                startPolling(result.orderId);
            }
        }
        catch (err) {
            setActionState('idle');
            setCheckoutError(err instanceof Error ? err.message : '生成支付二维码失败，请稍后重试');
            setCheckoutPlan(plan);
        }
    };
    const handleSubscribe = async (plan) => {
        if (!user) {
            navigate('/login');
            return;
        }
        setActionState('loading');
        try {
            const result = await createSubscriptionRequest({ userId: user.id, planCode: plan.code });
            setSubscription(result.subscription);
            updateUser(result.user);
            setActionState('success');
            await loadSubscriptionData();
        }
        catch (err) {
            setActionState('error');
            setError(err instanceof Error ? err.message : '订阅失败，请稍后重试');
        }
    };
    const handlePlanCheckout = async (plan) => {
        if (plan.price_cents === 0) {
            await handleSubscribe(plan);
            return;
        }
        setPendingPlanCode(plan.code);
        setCheckoutPlan(null);
        setCheckoutInfo(null);
        const provider = resolveProvider();
        await handleCheckout(plan, provider);
        setPendingPlanCode(null);
    };
    const checkoutQrImage = useMemo(() => {
        if (!checkoutInfo) {
            return null;
        }
        if (checkoutInfo.provider === 'wechat_personal') {
            return checkoutInfo.personalWechat?.qrUrl ?? null;
        }
        const data = checkoutInfo.wechat?.codeUrl ?? checkoutInfo.alipay?.qrCode ?? checkoutInfo.mock?.paymentUrl ?? null;
        return data ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data)}` : null;
    }, [checkoutInfo]);
    const providerLabel = useMemo(() => {
        if (!checkoutInfo)
            return null;
        if (checkoutInfo.provider === 'wechat')
            return '微信支付';
        if (checkoutInfo.provider === 'alipay')
            return '支付宝';
        if (checkoutInfo.provider === 'wechat_personal')
            return '微信转账（人工核实）';
        return '模拟支付';
    }, [checkoutInfo]);
    if (!user) {
        return (_jsx("div", { className: "subscription-page", children: _jsxs("div", { className: "subscription-card", children: [_jsx("h2", { children: "\u8BF7\u5148\u767B\u5F55" }), _jsx("p", { children: "\u767B\u5F55\u540E\u5373\u53EF\u67E5\u770B\u8BD5\u7528\u72B6\u6001\u5E76\u5B8C\u6210\u4F1A\u5458\u8BA2\u9605\u3002" }), _jsxs("div", { className: "subscription-plan__actions", children: [_jsx(Link, { to: "/login", className: "account-banner__link account-banner__link--primary", children: "\u524D\u5F80\u767B\u5F55" }), _jsx(Link, { to: "/register", className: "account-banner__link account-banner__link--muted", children: "\u7ACB\u5373\u6CE8\u518C" })] })] }) }));
    }
    return (_jsxs("div", { className: "subscription-page", children: [_jsxs("header", { className: "subscription-header", children: [_jsx("div", { children: _jsx("h1", { children: "\u4F1A\u5458\u8BA2\u9605\u4E0E\u652F\u4ED8" }) }), _jsx(Link, { to: "/app", className: "account-banner__link account-banner__link--muted", children: "\u8FD4\u56DE\u63A7\u5236\u53F0" })] }), error ? _jsx("div", { className: "subscription-error", children: error }) : null, providerStatusLoading ? _jsx("div", { className: "plan-meta", children: "\u6B63\u5728\u68C0\u6D4B\u652F\u4ED8\u65B9\u5F0F\u914D\u7F6E\u2026" }) : null, providerStatusError ? _jsx("div", { className: "subscription-error", children: providerStatusError }) : null, noRealProvider ? _jsx("div", { className: "plan-meta plan-meta--warning", children: "\u672A\u914D\u7F6E\u771F\u5B9E\u652F\u4ED8\u901A\u9053\uFF0C\u5F53\u524D\u73AF\u5883\u5C06\u4F7F\u7528\u6A21\u62DF\u652F\u4ED8\u3002" }) : null, _jsx("section", { className: "subscription-grid", style: { gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }, children: paidPlans.length === 0 ? (_jsx("div", { className: "subscription-card", children: _jsx("p", { children: "\u6682\u65E0\u53EF\u8D2D\u4E70\u7684\u4F1A\u5458\u5957\u9910\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002" }) })) : (paidPlans.map((plan) => {
                    const title = getPlanTitle(plan);
                    const benefits = getPlanBenefits(plan);
                    const isProcessing = pendingPlanCode === plan.code && actionState === 'loading';
                    return (_jsxs("article", { className: "membership-card subscription-plan-card", children: [_jsxs("div", { className: "subscription-plan-card__header", children: [_jsx("h3", { children: title }), currentPlanCode === plan.code ? _jsx("span", { className: "status-pill", children: "\u5F53\u524D\u8BA2\u9605" }) : null] }), _jsxs("p", { className: "plan-price", children: [formatAmount(plan.price_cents), _jsxs("span", { className: "plan-cycle", children: [" / ", plan.billing_interval === 'monthly' ? '月' : '年'] })] }), _jsx("ul", { className: "plan-benefits", children: benefits.map((benefit) => (_jsx("li", { children: benefit }, benefit))) }), _jsx("button", { type: "button", className: "btn primary", onClick: () => void handlePlanCheckout(plan), disabled: isProcessing || actionState === 'loading', children: isProcessing ? '生成支付码…' : '订阅（跳转支付码）' })] }, plan.code));
                })) }), checkoutPlan ? (_jsx("div", { className: "subscription-modal", children: _jsxs("div", { className: "subscription-modal__card", children: [_jsxs("div", { className: "checkout-panel__header", children: [_jsxs("div", { children: [_jsx("strong", { children: "\u652F\u4ED8\u4E8C\u7EF4\u7801" }), _jsxs("p", { className: "plan-meta", children: ["\u8BA2\u5355\u53F7\uFF1A", checkoutInfo?.outTradeNo ?? '生成中…'] })] }), _jsx("button", { type: "button", className: "subscription-modal__close", onClick: stopCheckout, children: "\u5173\u95ED" })] }), _jsxs("div", { className: "qr-preview__amount", children: [_jsx("span", { children: "\u5E94\u4ED8\u91D1\u989D" }), _jsx("strong", { children: formatAmount(checkoutPlan.price_cents) })] }), checkoutQrImage ? (_jsxs(_Fragment, { children: [_jsx("img", { className: "qr-preview__image", src: checkoutQrImage, alt: "\u652F\u4ED8\u4E8C\u7EF4\u7801" }), _jsx("p", { className: "qr-preview__hint", children: checkoutInfo?.provider === 'wechat_personal'
                                        ? checkoutInfo.personalWechat?.tips ?? '请使用微信扫一扫完成转账，并备注订单号或账号邮箱。'
                                        : `请使用${providerLabel ?? '对应'}扫码完成支付，完成后系统会自动刷新订阅状态。` })] })) : (_jsx("p", { className: "qr-preview__hint", children: "\u6B63\u5728\u751F\u6210\u4E8C\u7EF4\u7801\uFF0C\u8BF7\u7A0D\u5019\u2026" })), checkoutError ? _jsx("div", { className: "subscription-error", children: checkoutError }) : null, _jsxs("div", { className: "manual-verify-hint", children: [_jsx("p", { children: checkoutInfo?.provider === 'wechat_personal'
                                        ? '支付完成后，请添加客服微信并发送支付截图，我们会尽快人工确认订单。'
                                        : '支付完成后，请扫码添加客服微信，提供支付截图和账号信息，即可立即开通会员权限。' }), _jsx("img", { className: "manual-verify-hint__qr", src: checkoutInfo?.personalWechat?.supportQrUrl ?? '/assets/support-wechat.png', alt: "\u5BA2\u670D\u5FAE\u4FE1\u4E8C\u7EF4\u7801" })] }), _jsx("button", { type: "button", className: "btn secondary", onClick: () => void loadSubscriptionData(), children: "\u5DF2\u652F\u4ED8\uFF0C\u5237\u65B0\u72B6\u6001" })] }) })) : null] }));
}
