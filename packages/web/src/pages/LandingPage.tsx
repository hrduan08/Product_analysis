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

  return (
    <>
      <MarketingNav />
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <h1>洞察全球用户声音，用 7 天构建可订阅的产品情报平台</h1>
            <p>Product Insight 聚合 YouTube、Reddit 等渠道反馈，自动提炼热点、生成邮件卡片，并联动会员订阅系统完成付费转化。</p>
            <div className="cta-row">
              <button type="button" className="btn primary" onClick={handleStartTrial}>
                免费试用
              </button>
              <button type="button" className="btn" onClick={() => navigate(user ? '/app' : '/login')}>
                观看演示
              </button>
            </div>
          </div>
          <div className="hero-panel" style={{ maxWidth: 600, textAlign: 'left' }}>
            <img
              src="https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1100&q=70"
              alt="Product Insight"
            />
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, textAlign: 'center' }}>展示搜索配置和增量邮件卡片，突出真实使用场景。</p>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <header>
          <h2>一个容器即可浏览所有关键功能</h2>
          <p>参考主流 SaaS 交互，将核心亮点集中在可滚动的功能容器中，左侧按钮用于快速定位，右侧展示实时示意。</p>
        </header>
        <div className="shell feature-wrapper">
          <div className="feature-list">
            {FEATURE_BUTTONS.map((feature) => (
              <div key={feature} className="feature-button">
                {feature}
              </div>
            ))}
          </div>
          <div className="feature-canvas">
            <h3>实时示意：配置 → 推送 → 付费</h3>
            <p>用户在同一个容器里完成配置、查看推送样例、并了解付费权益。容器支持上下滚动，逐条浏览具体功能点。</p>
            <ul>
              {FEATURE_BULLETS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p style={{ color: 'var(--muted)' }}>交互：滚动容器、Hover 卡片、在移动端自动堆叠。</p>
          </div>
        </div>
      </section>

      <section className="section" id="usecases">
        <header>
          <h2>应用场景 · 几乎覆盖所有行业</h2>
          <p>用案例来讲故事，让访客快速匹配自身业务。</p>
        </header>
        <div className="shell use-cases">
          {USE_CASES.map((item) => (
            <div className="use-case" key={item}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="resources">
        <header>
          <h2>资源中心 & 我们如何帮助你上手</h2>
          <p>借鉴竞品“帮助信息”布局，提供多维度指南。</p>
        </header>
        <div className="shell resource-grid">
          {RESOURCES.map((resource) => (
            <article key={resource.title} className="resource">
              <h4>{resource.title}</h4>
              <p>{resource.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="cta">
        <div className="shell cta-banner">
          <h2 style={{ marginBottom: 12 }}>立即注册，解锁 7 天正式会员体验</h2>
          <p style={{ marginBottom: 24 }}>无需信用卡即可开始；如果需要提前配置支付方式，也提供卡号预授权流程。</p>
          <div className="cta-row" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn primary" onClick={handleStartTrial}>
              注册并体验
            </button>
            <button type="button" className="btn">
              下载演示数据
            </button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
