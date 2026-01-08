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
  ] as const;

  return (
    <>
      <MarketingNav />
      <section className="section">
        <header>
          <h2>{TEXT.title}</h2>
          <p>{TEXT.desc}</p>
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
                {TEXT.subscribe}
              </a>
            </article>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </>
  );
}
