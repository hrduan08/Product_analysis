import { test, expect } from '@playwright/test';
import { addDays } from 'date-fns';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const ADMIN_TOKEN = 'test-admin-token';
const TEST_PLAN_CODE = 'MONTHLY_BASIC';

const shouldSkip = !process.env.DATABASE_URL;
test.skip(shouldSkip, 'DATABASE_URL 未配置，跳过支付端到端测试');

let server: Server | null = null;
let baseURL = '';
let prisma: typeof import('../../packages/server/src/db/prisma.js').prisma;

test.beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.ADMIN_TOKEN = ADMIN_TOKEN;
  process.env.MAIL_PROVIDER = 'stub';
  process.env.MAIL_TO = '';
  process.env.ALERT_SLACK_WEBHOOK = '';
  process.env.USER_SEARCH_CRON_ENABLED = 'false';
  process.env.PAYMENT_ORDER_PREFIX = 'PW';

  if (!process.env.DATABASE_URL) {
    throw new Error('E2E 测试需要先配置 DATABASE_URL 环境变量');
  }

  const [{ default: app }, prismaModule] = await Promise.all([
    import('../../packages/server/src/app.js'),
    import('../../packages/server/src/db/prisma.js')
  ]);
  prisma = prismaModule.prisma;

  await prisma.plan.upsert({
    where: { code: TEST_PLAN_CODE },
    update: {
      name: '月度会员',
      description: '解锁 2 个关键词 + 每日 2 次定时搜索，E2E 自动化测试使用。',
      price_cents: 900,
      currency: 'CNY',
      billing_interval: 'monthly',
      is_active: true,
      limits: {
        keywords: 2,
        members: 1,
        notifications: ['email', 'feishu'],
        exports: false
      }
    },
    create: {
      code: TEST_PLAN_CODE,
      name: '月度会员',
      description: '解锁 2 个关键词 + 每日 2 次定时搜索，E2E 自动化测试使用。',
      price_cents: 900,
      currency: 'CNY',
      billing_interval: 'monthly',
      is_active: true,
      limits: {
        keywords: 2,
        members: 1,
        notifications: ['email', 'feishu'],
        exports: false
      }
    }
  });

  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = null;
  }
  if (prisma) {
    await prisma.$disconnect();
  }
});

test('完成 mock 支付回调后激活订阅', async () => {
  const user = await createTestUser();
  const api = await test.request.newContext({ baseURL });

  const checkoutRes = await api.post('/api/billing/payments/checkout', {
    data: { userId: user.id, planCode: TEST_PLAN_CODE, provider: 'mock' }
  });
  expect(checkoutRes.status()).toBe(201);
  const checkoutBody = await checkoutRes.json();
  const orderId: string = checkoutBody.orderId;

  const callbackRes = await api.post(`/api/_dev/payments/${orderId}/mock-status`, {
    headers: { 'x-admin-token': ADMIN_TOKEN },
    data: { status: 'paid', payload: { source: 'playwright' } }
  });
  expect(callbackRes.status()).toBe(200);

  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    include: { subscription: true }
  });
  expect(order?.status).toBe('paid');
  expect(order?.subscription_id).toBeTruthy();

  const subscription = await prisma.userSubscription.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
    include: { plan: true }
  });
  expect(subscription?.status).toBe('active');
  expect(subscription?.plan?.code).toBe(TEST_PLAN_CODE);

  const invoice = await prisma.invoice.findFirst({ where: { payment_order_id: orderId } });
  expect(invoice?.status).toBe('paid');

  await api.dispose();
});

test('重复成功回调不会重复创建订阅', async () => {
  const user = await createTestUser();
  const api = await test.request.newContext({ baseURL });

  const { orderId } = await createMockOrder(api, user.id);

  const first = await api.post(`/api/_dev/payments/${orderId}/mock-status`, {
    headers: { 'x-admin-token': ADMIN_TOKEN },
    data: { status: 'paid' }
  });
  expect(first.ok()).toBeTruthy();

  const second = await api.post(`/api/_dev/payments/${orderId}/mock-status`, {
    headers: { 'x-admin-token': ADMIN_TOKEN },
    data: { status: 'paid' }
  });
  expect(second.ok()).toBeTruthy();

  const subscriptionCount = await prisma.userSubscription.count({ where: { user_id: user.id } });
  expect(subscriptionCount).toBe(1);

  const invoiceCount = await prisma.invoice.count({ where: { payment_order_id: orderId } });
  expect(invoiceCount).toBe(1);

  await api.dispose();
});

test('失败回调会标记订单失败', async () => {
  const user = await createTestUser();
  const api = await test.request.newContext({ baseURL });

  const { orderId } = await createMockOrder(api, user.id);

  const response = await api.post(`/api/_dev/payments/${orderId}/mock-status`, {
    headers: { 'x-admin-token': ADMIN_TOKEN },
    data: { status: 'failed', reason: 'MOCK_FAIL' }
  });
  expect(response.ok()).toBeTruthy();

  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  expect(order?.status).toBe('failed');
  expect(order?.last_error).toBe('MOCK_FAIL');
  expect(order?.subscription_id).toBeNull();

  await api.dispose();
});

async function createTestUser() {
  const email = `playwright+${randomUUID()}@example.com`;
  return prisma.user.create({
    data: {
      email,
      password_hash: 'hashed-password',
      trial_ends_at: addDays(new Date(), 7),
      status: 'trialing'
    }
  });
}

async function createMockOrder(api: import('@playwright/test').APIRequestContext, userId: string) {
  const checkoutRes = await api.post('/api/billing/payments/checkout', {
    data: { userId, planCode: TEST_PLAN_CODE, provider: 'mock' }
  });
  expect(checkoutRes.status()).toBe(201);
  const body = await checkoutRes.json();
  return body as { orderId: string; outTradeNo: string };
}
