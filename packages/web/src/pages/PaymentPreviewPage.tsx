import { MarketingFooter } from '../components/MarketingFooter';
import { MarketingNav } from '../components/MarketingNav';

export function PaymentPreviewPage() {
  return (
    <>
      <MarketingNav />
      <section className="section">
        <header>
          <h2>试用后置支付流程 · 明确套餐 + 银行卡</h2>
          <p>试用用户可选择 14 天套餐并输入信用卡，试用结束自动扣款。</p>
        </header>
        <div className="shell payment-grid">
          <div className="card">
            <h4>选择试用方案</h4>
            <div className="cta-row" style={{ padding: '12px 0' }}>
              <button type="button" className="btn secondary" style={{ flex: 1 }}>
                14 天基础试用
              </button>
              <button type="button" className="btn" style={{ flex: 1 }}>
                14 天进阶试用
              </button>
            </div>
            <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <input type="checkbox" defaultChecked />
              <span>可选增强包：并发运行 + 高速抓取</span>
            </label>
            <h4 style={{ marginTop: 24 }}>支付方式</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn secondary" style={{ flex: 1 }}>
                银行卡
              </button>
              <button type="button" className="btn" style={{ flex: 1 }}>
                PayPal
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
            <h4>订单摘要</h4>
            <p>14 天标准试用 · 免费</p>
            <p>Max cloud nodes: 3</p>
            <p>下一次扣款：2025-11-28</p>
            <button type="button" className="btn primary" style={{ width: '100%', marginTop: 16 }}>
              确认试用
            </button>
            <div className="card" style={{ marginTop: 18, background: 'rgba(16, 185, 129, 0.12)', borderColor: 'transparent' }}>
              <strong>5 天退款保障</strong>
              <p>如果不满意，可在试用后 5 天内发起退款。</p>
            </div>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </>
  );
}
