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

  return (
    <>
      <MarketingNav />
      <section className="section">
        <header>
          <h2>{TEXT.title}</h2>
          <p>{TEXT.desc}</p>
        </header>
        <div className="shell payment-grid">
          <div className="card">
            <h4>{TEXT.chooseTrial}</h4>
            <div className="cta-row" style={{ padding: '12px 0' }}>
              <button type="button" className="btn secondary" style={{ flex: 1 }}>
                {TEXT.trialBasic}
              </button>
              <button type="button" className="btn" style={{ flex: 1 }}>
                {TEXT.trialPro}
              </button>
            </div>
            <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <input type="checkbox" defaultChecked />
              <span>{TEXT.addon}</span>
            </label>
            <h4 style={{ marginTop: 24 }}>{TEXT.payMethod}</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn secondary" style={{ flex: 1 }}>
                {TEXT.card}
              </button>
              <button type="button" className="btn" style={{ flex: 1 }}>
                {TEXT.paypal}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <input placeholder="Card Number" style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)' }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <input placeholder="MM/YY" style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border)' }} />
                <input placeholder="CVV" style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border)' }} />
              </div>
            </div>
          </div>
          <div className="card" style={{ alignSelf: 'stretch' }}>
            <h4>{TEXT.orderSummary}</h4>
            <p>{TEXT.freeTrial}</p>
            <p>Max cloud nodes: 3</p>
            <p>
              {TEXT.nextBill}2025-11-28
            </p>
            <button type="button" className="btn primary" style={{ width: '100%', marginTop: 16 }}>
              {TEXT.confirm}
            </button>
            <div className="card" style={{ marginTop: 18, background: 'rgba(16, 185, 129, 0.12)', borderColor: 'transparent' }}>
              <strong>{TEXT.refundTitle}</strong>
              <p>{TEXT.refundDesc}</p>
            </div>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </>
  );
}
