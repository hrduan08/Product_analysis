import { prisma } from '../src/db/prisma.js';

const plans = [
  {
    code: 'MONTHLY_BASIC',
    name: '月度会员',
    description: '解锁 2 个关键词 + 每日 2 次定时搜索，适合短期项目或验证阶段。',
    price_cents: 900,
    currency: 'CNY',
    billing_interval: 'monthly',
    is_active: true,
    limits: {
      keywords: 2,
      notifications: ['email', 'feishu'],
      exports: false
    },
    metadata: {
      badge: '推荐',
      maxSlots: 2
    }
  },
  {
    code: 'YEARLY_BASIC',
    name: '年度会员',
    description: '365 天持续监控，享优先 API 配额与长期价格优惠（折合 8.25 元/月）。',
    price_cents: 9900,
    currency: 'CNY',
    billing_interval: 'yearly',
    is_active: true,
    limits: {
      keywords: 2,
      notifications: ['email', 'feishu'],
      exports: false
    },
    metadata: {
      badge: '最划算',
      maxSlots: 2
    }
  }
] as const;

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        price_cents: plan.price_cents,
        currency: plan.currency,
        billing_interval: plan.billing_interval,
        is_active: plan.is_active,
        limits: plan.limits,
        metadata: plan.metadata ?? null
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        price_cents: plan.price_cents,
        currency: plan.currency,
        billing_interval: plan.billing_interval,
        is_active: plan.is_active,
        limits: plan.limits,
        metadata: plan.metadata ?? null
      }
    });
  }
}

main()
  .then(() => {
    console.log('[seed] 套餐数据初始化完成');
  })
  .catch((error) => {
    console.error('[seed] 套餐数据初始化失败', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
