import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { createSubscriptionRequest, fetchPlans, fetchSubscription, type Plan, type SubscriptionRecord } from '../../services/billing';
import {
  createPaymentCheckout,
  fetchPaymentProviders,
  fetchPaymentStatus,
  type CheckoutResult,
  type PaymentProvider,
  type PaymentProviderStatus
} from '../../services/payment';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

const allowedPlanCodes = new Set(['MONTHLY_BASIC', 'YEARLY_BASIC']);

const formatAmount = (cents: number): string => `¥${(cents / 100).toFixed(2)}`;

export function SubscriptionPage(): JSX.Element {
  const { user, updateUser } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const [providerStatus, setProviderStatus] = useState<PaymentProviderStatus[]>([]);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);

  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutResult | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<LoadingState>('idle');
  const [pendingPlanCode, setPendingPlanCode] = useState<string | null>(null);

  const pollingRef = useRef<number | null>(null);

  const TEXT = t({
    zh: {
      pageTitle: '会员订阅与支付',
      back: '返回控制台',
      loadingProviders: '正在检测支付方式配置…',
      providerError: '获取支付方式失败',
      noProvider: '未配置真实支付通道，当前环境将使用模拟支付。',
      noPlan: '暂无可购买的会员套餐，请稍后再试。',
      current: '当前订阅',
      perMonth: '月',
      perYear: '年',
      btnSubscribe: '订阅（跳转支付码）',
      btnGenerating: '生成支付码…',
      qrTitle: '支付二维码',
      orderNo: '订单号',
      close: '关闭',
      amountDue: '应付金额',
      qrGenerating: '正在生成二维码，请稍候…',
      qrHint: '请使用对应扫码完成支付，完成后系统会自动刷新订阅状态。',
      qrPersonalHint: '请使用微信扫一扫完成转账，并备注订单号或账号邮箱。',
      payFailed: '支付失败，请重新扫码',
      payCanceled: '订单已取消',
      payExpired: '订单已过期',
      payStatusError: '查询支付状态失败',
      generateQrFail: '生成支付二维码失败，请稍后重试',
      subFail: '订阅失败，请稍后重试',
      payDoneRefresh: '已支付，刷新状态',
      supportHintPersonal: '支付完成后，请添加客服微信并发送支付截图，我们会尽快人工确认订单。',
      supportHintNormal: '支付完成后，请扫码添加客服微信，提供支付截图和账号信息，即可立即开通会员权限。',
      loginTitle: '请先登录',
      loginDesc: '登录后即可查看试用状态并完成会员订阅。',
      goLogin: '前往登录',
      goRegister: '立即注册',
      trial: '试用中',
      active: '已订阅',
      pastDue: '待续费',
      canceled: '已取消',
      planMonthly: '月度会员',
      planYearly: '年度会员',
      benefitKeywords: '最多可设置 2 个监控关键词',
      benefitRuns: '每天定时监控 2 次',
      benefitNotify: '飞书 + 邮件通知监控结果',
      benefitYearlyExtra: '全年一次付清，立省 17%',
      checkoutStatusWaiting: '等待支付…',
      providerWechat: '微信支付',
      providerAlipay: '支付宝',
      providerWechatPersonal: '微信转账（人工核实）',
      providerMock: '模拟支付'
    },
    en: {
      pageTitle: 'Subscription & Payment',
      back: 'Back to dashboard',
      loadingProviders: 'Checking payment providers…',
      providerError: 'Failed to load payment providers',
      noProvider: 'No real payment channel configured, mock payment will be used.',
      noPlan: 'No plans available for purchase. Please try again later.',
      current: 'Current plan',
      perMonth: 'mo',
      perYear: 'yr',
      btnSubscribe: 'Subscribe (get QR)',
      btnGenerating: 'Generating QR…',
      qrTitle: 'Payment QR code',
      orderNo: 'Order No.',
      close: 'Close',
      amountDue: 'Amount due',
      qrGenerating: 'Generating QR, please wait…',
      qrHint: 'Scan with the corresponding app to pay; status will refresh automatically.',
      qrPersonalHint: 'Scan with WeChat and include order number or email in the note.',
      payFailed: 'Payment failed, please scan again',
      payCanceled: 'Order canceled',
      payExpired: 'Order expired',
      payStatusError: 'Failed to query payment status',
      generateQrFail: 'Failed to create payment QR, please try again',
      subFail: 'Subscription failed, please try again',
      payDoneRefresh: 'Paid, refresh status',
      supportHintPersonal: 'After payment, add support WeChat and send screenshot for manual confirmation.',
      supportHintNormal: 'After payment, add support WeChat with screenshot and account info for instant activation.',
      loginTitle: 'Please log in',
      loginDesc: 'Log in to view your trial and complete subscription.',
      goLogin: 'Log in',
      goRegister: 'Sign up',
      trial: 'Trial',
      active: 'Active',
      pastDue: 'Past due',
      canceled: 'Canceled',
      planMonthly: 'Monthly',
      planYearly: 'Yearly',
      benefitKeywords: 'Up to 2 monitored keywords',
      benefitRuns: '2 scheduled runs per day',
      benefitNotify: 'Feishu + email notifications',
      benefitYearlyExtra: 'Pay yearly once, save 17%',
      checkoutStatusWaiting: 'Waiting for payment…',
      providerWechat: 'WeChat Pay',
      providerAlipay: 'Alipay',
      providerWechatPersonal: 'WeChat transfer (manual verify)',
      providerMock: 'Mock payment'
    }
  });

  const sharedBenefits = useMemo(
    () => [TEXT.benefitKeywords, TEXT.benefitRuns, TEXT.benefitNotify],
    [TEXT]
  );

  const planBenefitMap: Record<string, { title: string; benefits: string[] }> = useMemo(
    () => ({
      MONTHLY_BASIC: {
        title: TEXT.planMonthly,
        benefits: sharedBenefits
      },
      YEARLY_BASIC: {
        title: TEXT.planYearly,
        benefits: [...sharedBenefits, TEXT.benefitYearlyExtra]
      }
    }),
    [TEXT, sharedBenefits]
  );

  const getPlanTitle = (plan: Plan): string => planBenefitMap[plan.code]?.title ?? plan.name;
  const getPlanBenefits = (plan: Plan): string[] => planBenefitMap[plan.code]?.benefits ?? sharedBenefits;

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, []);

  const loadSubscriptionData = async () => {
    if (!user) return;
    setLoading('loading');
    try {
      const [planList, subscriptionResult] = await Promise.all([fetchPlans(), fetchSubscription(user.id)]);
      setPlans(planList);
      setSubscription(subscriptionResult.subscription);
      const expireAt = subscriptionResult.subscription?.current_period_end ?? subscriptionResult.user.planExpireAt ?? null;
      updateUser({
        ...user,
        status: subscriptionResult.user.status as typeof user.status,
        trialStartedAt: subscriptionResult.user.trialStartedAt,
        trialEndsAt: subscriptionResult.user.trialEndsAt,
        planExpireAt: expireAt,
        planId: subscriptionResult.plan?.id ?? subscriptionResult.subscription?.plan_id ?? null
      });
      setError(null);
      setLoading('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'zh' ? '加载失败，请稍后再试' : 'Failed to load, please try again'));
      setLoading('error');
    }
  };

  const loadProviderStatus = async () => {
    try {
      const providers = await fetchPaymentProviders();
      setProviderStatus(providers);
      setProviderStatusError(null);
    } catch (err) {
      setProviderStatus([]);
      setProviderStatusError(err instanceof Error ? err.message : TEXT.providerError);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadSubscriptionData();
  }, [user]);

  useEffect(() => {
    void loadProviderStatus();
  }, []);

  const paidPlans = useMemo(() => {
    return plans.filter((plan) => allowedPlanCodes.has(plan.code));
  }, [plans]);

  const currentPlanCode = useMemo(() => {
    if (!subscription) return null;
    if (subscription.plan) {
      return subscription.plan.code;
    }
    if (subscription.plan_id) {
      return plans.find((plan) => plan.id === subscription.plan_id)?.code ?? null;
    }
    return null;
  }, [plans, subscription]);

  const subscriptionStatusLabel = useMemo(() => {
    if (!subscription?.status) return null;
    const map = lang === 'zh'
      ? { trialing: TEXT.trial, active: TEXT.active, past_due: TEXT.pastDue, canceled: TEXT.canceled, expired: TEXT.pastDue }
      : { trialing: TEXT.trial, active: TEXT.active, past_due: TEXT.pastDue, canceled: TEXT.canceled, expired: TEXT.pastDue };
    return map[subscription.status] ?? subscription.status;
  }, [TEXT.active, TEXT.canceled, TEXT.pastDue, TEXT.trial, lang, subscription?.status]);

  const providerStatusLoading = providerStatus.length === 0 && !providerStatusError;
  const enabledProviders = providerStatus.filter((item) => item.enabled).map((item) => item.provider);
  const noRealProvider = providerStatus.length > 0 && enabledProviders.length === 0;
  const personalOnlyProvider =
    enabledProviders.includes('wechat_personal') && !enabledProviders.some((provider) => provider === 'wechat' || provider === 'alipay');

  const resolveProvider = (): PaymentProvider => {
    if (enabledProviders.includes('wechat')) return 'wechat';
    if (enabledProviders.includes('alipay')) return 'alipay';
    if (enabledProviders.includes('wechat_personal')) return 'wechat_personal';
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

  const startPolling = (orderId: string) => {
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
        } else if (['failed', 'canceled', 'expired'].includes(status.status)) {
          setCheckoutError(
            status.status === 'failed' ? TEXT.payFailed : status.status === 'canceled' ? TEXT.payCanceled : TEXT.payExpired
          );
          if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (err) {
        setCheckoutError(err instanceof Error ? err.message : TEXT.payStatusError);
      }
    }, 3000);
  };

  const handleCheckout = async (plan: Plan, provider: PaymentProvider) => {
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
      } else {
        startPolling(result.orderId);
      }
    } catch (err) {
      setActionState('idle');
      setCheckoutError(err instanceof Error ? err.message : TEXT.generateQrFail);
      setCheckoutPlan(plan);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
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
    } catch (err) {
      setActionState('error');
      setError(err instanceof Error ? err.message : TEXT.subFail);
    }
  };

  const handlePlanCheckout = async (plan: Plan) => {
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

  const qrAlt = lang === 'zh' ? '支付二维码' : 'Payment QR';
  const supportAlt = lang === 'zh' ? '客服微信二维码' : 'Support WeChat QR';

  const providerLabel = useMemo(() => {
    if (!checkoutInfo) return null;
    if (checkoutInfo.provider === 'wechat') return TEXT.providerWechat;
    if (checkoutInfo.provider === 'alipay') return TEXT.providerAlipay;
    if (checkoutInfo.provider === 'wechat_personal') return TEXT.providerWechatPersonal;
    return TEXT.providerMock;
  }, [TEXT.providerAlipay, TEXT.providerMock, TEXT.providerWechat, TEXT.providerWechatPersonal, checkoutInfo]);

  if (!user) {
    return (
      <div className="subscription-page">
        <div className="subscription-card">
          <h2>{TEXT.loginTitle}</h2>
          <p>{TEXT.loginDesc}</p>
          <div className="subscription-plan__actions">
            <Link to="/login" className="account-banner__link account-banner__link--primary">
              {TEXT.goLogin}
            </Link>
            <Link to="/register" className="account-banner__link account-banner__link--muted">
              {TEXT.goRegister}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-page">
      <header className="subscription-header">
        <div>
          <h1>{TEXT.pageTitle}</h1>
        </div>
        <Link to="/app" className="account-banner__link account-banner__link--muted">
          {TEXT.back}
        </Link>
      </header>

      {error ? <div className="subscription-error">{error}</div> : null}
      {providerStatusLoading ? <div className="plan-meta">{TEXT.loadingProviders}</div> : null}
      {providerStatusError ? <div className="subscription-error">{providerStatusError}</div> : null}
      {noRealProvider ? <div className="plan-meta plan-meta--warning">{TEXT.noProvider}</div> : null}
      <section className="subscription-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {paidPlans.length === 0 ? (
          <div className="subscription-card">
            <p>{TEXT.noPlan}</p>
          </div>
        ) : (
          paidPlans.map((plan) => {
            const title = getPlanTitle(plan);
            const benefits = getPlanBenefits(plan);
            const isProcessing = pendingPlanCode === plan.code && actionState === 'loading';
            return (
              <article key={plan.code} className="membership-card subscription-plan-card">
                <div className="subscription-plan-card__header">
                  <h3>{title}</h3>
                  {currentPlanCode === plan.code ? <span className="status-pill">{TEXT.current}</span> : null}
                </div>
                <p className="plan-price">
                  {formatAmount(plan.price_cents)}
                  <span className="plan-cycle"> / {plan.billing_interval === 'monthly' ? TEXT.perMonth : TEXT.perYear}</span>
                </p>
                <ul className="plan-benefits">
                  {benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void handlePlanCheckout(plan)}
                  disabled={isProcessing || actionState === 'loading'}
                >
                  {isProcessing ? TEXT.btnGenerating : TEXT.btnSubscribe}
                </button>
              </article>
            );
          })
        )}
      </section>

      {checkoutPlan ? (
        <div className="subscription-modal">
          <div className="subscription-modal__card">
            <div className="checkout-panel__header">
              <div>
                <strong>{TEXT.qrTitle}</strong>
                <p className="plan-meta">
                  {TEXT.orderNo}：{checkoutInfo?.outTradeNo ?? TEXT.qrGenerating}
                </p>
              </div>
              <button type="button" className="subscription-modal__close" onClick={stopCheckout}>
                {TEXT.close}
              </button>
            </div>
            <div className="qr-preview__amount">
              <span>{TEXT.amountDue}</span>
              <strong>{formatAmount(checkoutPlan.price_cents)}</strong>
            </div>
            {checkoutQrImage ? (
              <>
                <img
                  className="qr-preview__image"
                  src={checkoutQrImage}
                  alt={qrAlt}
                />
                <p className="qr-preview__hint">
                  {checkoutInfo?.provider === 'wechat_personal'
                    ? checkoutInfo.personalWechat?.tips ?? TEXT.qrPersonalHint
                    : `${TEXT.qrHint}`}
                </p>
              </>
            ) : (
              <p className="qr-preview__hint">{TEXT.qrGenerating}</p>
            )}
            {checkoutError ? <div className="subscription-error">{checkoutError}</div> : null}
            <div className="manual-verify-hint">
              <p>
                {checkoutInfo?.provider === 'wechat_personal'
                  ? TEXT.supportHintPersonal
                  : TEXT.supportHintNormal}
              </p>
              <img
                className="manual-verify-hint__qr"
                src={checkoutInfo?.personalWechat?.supportQrUrl ?? '/assets/support-wechat.png'}
                alt={supportAlt}
              />
            </div>
            <button type="button" className="btn secondary" onClick={() => void loadSubscriptionData()}>
              {TEXT.payDoneRefresh}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
