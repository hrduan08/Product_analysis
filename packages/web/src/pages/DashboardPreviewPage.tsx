import { MarketingFooter } from '../components/MarketingFooter';
import { MarketingNav } from '../components/MarketingNav';

const QUICK_MENU_ITEMS = ['账号设置', '安全中心', '优惠券 / 发票 / 信用额度', '退出登录'];

export function DashboardPreviewPage() {
  return (
    <>
      <MarketingNav />
      <section className="section">
        <header>
          <h2>主控制台 · 会员状态 + 最近任务</h2>
          <p>登录后按照竞品的布局展示账户信息与导航。</p>
        </header>
        <div className="shell dashboard-grid">
          <div className="card" style={{ background: '#f8fafc' }}>
            <h4>侧边导航</h4>
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
            <h4>欢迎回来</h4>
            <p>当前套餐：年度会员 · 到期 2025/11/28</p>
            <p>关键词额度 2/2 · 执行时间 2/2</p>
            <p>最近任务列表 + 状态（完成/排队中）</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <header>
            <h2>账号快捷菜单</h2>
            <p>点击右上角头像弹出，展示当前套餐与常用入口。</p>
          </header>
          <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
            <strong>Roy_Duan</strong>
            <p>duanhr.work@gmail.com</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>当前套餐：年度会员</span>
              <button type="button" className="btn secondary">
                更改套餐
              </button>
            </div>
            <ul style={{ marginTop: 18, listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
              {QUICK_MENU_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </>
  );
}
