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
] as const;

export function PricingPage() {
  return (
    <>
      <MarketingNav />
      <section className="section">
        <header>
          <h2>会员订阅 · 直接选择套餐并支付</h2>
          <p>页面只保留月度 / 年度两档套餐，点击“订阅”即可跳转到控制台完成支付二维码。</p>
        </header>
        <div className="shell pricing-grid">
          {PLANS.map((plan) => (
            <article key={plan.code} className="pricing-card highlight">
              <div className="pricing-card__badge">{plan.badge}</div>
              <h4>{plan.title}</h4>
              <p className="plan-price">
                {plan.price}
                <span className="plan-cycle">{plan.cycle}</span>
              </p>
              <ul className="plan-benefits">
                {plan.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <a className="btn primary" style={{ width: '100%', textAlign: 'center' }} href="/app/subscription">
                订阅（跳转支付码）
              </a>
            </article>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </>
  );
}
