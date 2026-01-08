import { MarketingFooter } from '../components/MarketingFooter';
import { MarketingNav } from '../components/MarketingNav';
import { useLanguage } from '../contexts/LanguageContext';

const QUICK_MENU_ITEMS = ['account', 'security', 'billing', 'logout'] as const;

export function DashboardPreviewPage() {
  const { t, lang } = useLanguage();
  const TEXT = t({
    zh: {
      title: '主控制台 · 会员状态 + 最近任务',
      desc: '登录后按照竞品的布局展示账户信息与导航。',
      sideNav: '侧边导航',
      welcome: '欢迎回来',
      plan: '当前套餐：年度会员 · 到期 2025/11/28',
      quota: '关键词额度 2/2 · 执行时间 2/2',
      recent: '最近任务列表 + 状态（完成/排队中）',
      quickTitle: '账号快捷菜单',
      quickDesc: '点击右上角头像弹出，展示当前套餐与常用入口。',
      changePlan: '更改套餐',
      quickMap: {
        account: '账号设置',
        security: '安全中心',
        billing: '优惠券 / 发票 / 信用额度',
        logout: '退出登录'
      }
    },
    en: {
      title: 'Dashboard preview · Plan & recent tasks',
      desc: 'Shows account info and navigation after login.',
      sideNav: 'Side navigation',
      welcome: 'Welcome back',
      plan: 'Current plan: Yearly · Expires 2025/11/28',
      quota: 'Keywords 2/2 · Schedule 2/2',
      recent: 'Recent tasks + status (done/queued)',
      quickTitle: 'Quick account menu',
      quickDesc: 'Opens from avatar, showing plan and shortcuts.',
      changePlan: 'Change plan',
      quickMap: {
        account: 'Account settings',
        security: 'Security',
        billing: 'Coupons / Invoice / Credit',
        logout: 'Logout'
      }
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
        <div className="shell dashboard-grid">
          <div className="card" style={{ background: '#f8fafc' }}>
            <h4>{TEXT.sideNav}</h4>
            <ul>
              <li>Overview</li>
              <li>Tasks &amp; Datasets</li>
              <li>Templates</li>
              <li>Plans &amp; Payment</li>
              <li>Account &amp; Security</li>
              <li>Referral</li>
            </ul>
          </div>
          <div className="card">
            <h4>{TEXT.welcome}</h4>
            <p>{TEXT.plan}</p>
            <p>{TEXT.quota}</p>
            <p>{TEXT.recent}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <header>
            <h2>{TEXT.quickTitle}</h2>
            <p>{TEXT.quickDesc}</p>
          </header>
          <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
            <strong>Roy_Duan</strong>
            <p>duanhr.work@gmail.com</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{lang === 'zh' ? '当前套餐：年度会员' : 'Current plan: Yearly'}</span>
              <button type="button" className="btn secondary">
                {TEXT.changePlan}
              </button>
            </div>
            <ul style={{ marginTop: 18, listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
              {QUICK_MENU_ITEMS.map((item) => {
                const label = TEXT.quickMap[item];
                return <li key={item}>{label}</li>;
              })}
            </ul>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </>
  );
}
