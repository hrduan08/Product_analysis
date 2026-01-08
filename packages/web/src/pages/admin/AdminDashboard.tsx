import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  expireAdminPayment,
  failAdminPayment,
  fetchAdminAlerts,
  fetchAdminPayments,
  fetchAdminSubscriptions,
  fetchAdminUsers,
  retryAdminPayment,
  type AdminAlert,
  type AdminPayment,
  type AdminSubscription,
  type AdminUserInfo
} from '../../services/admin';

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;

type LoadingState = 'idle' | 'loading' | 'error' | 'success';

type TabKey = 'payments' | 'subscriptions' | 'alerts' | 'users';

export function AdminDashboard(): JSX.Element {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('payments');
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [alertSeverity, setAlertSeverity] = useState<string>('');
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>(() => ADMIN_TOKEN ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const TEXT = t({
    zh: {
      needAdmin: '需要管理员权限',
      needAdminDesc: '请联系运维获取 `ADMIN_TOKEN`，在 `.env.local` 中设置 `VITE_ADMIN_TOKEN` 或在此输入。',
      tokenPlaceholder: '输入管理员令牌',
      tryLoad: '尝试加载',
      headerTitle: '运营后台',
      headerDesc: '查看支付订单、订阅状态，并手动处理异常。',
      back: '返回控制台',
      tabPayments: '支付订单',
      tabSubscriptions: '订阅状态',
      tabAlerts: '告警',
      tabUsers: '用户信息',
      statusFilter: '状态筛选：',
      all: '全部',
      refresh: '刷新',
      loading: '加载中...',
      loadPayFail: '加载订单失败',
      loadSubFail: '加载订阅失败',
      loadAlertFail: '加载告警失败',
      loadUserFail: '加载用户信息失败',
      table: {
        orderId: '订单ID',
        status: '状态',
        provider: '渠道',
        amount: '金额',
        user: '用户',
        plan: '套餐',
        updatedAt: '更新时间',
        actions: '操作',
        subUser: '用户',
        subPlan: '套餐',
        subStatus: '状态',
        subExpire: '到期日',
        alertAt: '时间',
        alertSeverity: '严重级别',
        alertMessage: '告警信息',
        alertMeta: '附加信息',
        userEmail: '邮箱',
        userPlan: '套餐',
        userStatus: '状态',
        userCreated: '创建时间'
      },
      noAuth: '管理员令牌未配置或权限不足'
    },
    en: {
      needAdmin: 'Admin access required',
      needAdminDesc: 'Ask ops for `ADMIN_TOKEN`, set `VITE_ADMIN_TOKEN` in `.env.local` or enter it below.',
      tokenPlaceholder: 'Enter admin token',
      tryLoad: 'Load',
      headerTitle: 'Admin Console',
      headerDesc: 'View payments, subscriptions, handle issues.',
      back: 'Back to dashboard',
      tabPayments: 'Payments',
      tabSubscriptions: 'Subscriptions',
      tabAlerts: 'Alerts',
      tabUsers: 'Users',
      statusFilter: 'Status filter:',
      all: 'All',
      refresh: 'Refresh',
      loading: 'Loading...',
      loadPayFail: 'Failed to load orders',
      loadSubFail: 'Failed to load subscriptions',
      loadAlertFail: 'Failed to load alerts',
      loadUserFail: 'Failed to load users',
      table: {
        orderId: 'Order ID',
        status: 'Status',
        provider: 'Provider',
        amount: 'Amount',
        user: 'User',
        plan: 'Plan',
        updatedAt: 'Updated at',
        actions: 'Actions',
        subUser: 'User',
        subPlan: 'Plan',
        subStatus: 'Status',
        subExpire: 'Expires at',
        alertAt: 'Time',
        alertSeverity: 'Severity',
        alertMessage: 'Alert',
        alertMeta: 'Meta',
        userEmail: 'Email',
        userPlan: 'Plan',
        userStatus: 'Status',
        userCreated: 'Created at'
      },
      noAuth: 'Admin token missing or insufficient permission'
    }
  });

  const isAdmin = useMemo(() => {
    if (token && token.length > 0) {
      return true;
    }
    return user?.status === 'active' && user.email?.endsWith('@example.com');
  }, [token, user]);

  useEffect(() => {
    if (!isAdmin) {
      setError(TEXT.noAuth);
    }
  }, [TEXT.noAuth, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    setLoading('loading');
    setError(null);
    setMessage(null);
    if (activeTab === 'payments') {
      fetchAdminPayments({ status: statusFilter, token })
        .then((data) => {
          setPayments(data.orders);
          setError(null);
          setLoading('success');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : TEXT.loadPayFail);
          setLoading('error');
        });
    } else if (activeTab === 'subscriptions') {
      fetchAdminSubscriptions({ token })
        .then((data) => {
          setSubscriptions(data.subscriptions);
          setError(null);
          setLoading('success');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : TEXT.loadSubFail);
          setLoading('error');
        });
    } else if (activeTab === 'alerts') {
      fetchAdminAlerts({ token, severity: alertSeverity || undefined })
        .then((data) => {
          setAlerts(data.alerts);
          setError(null);
          setLoading('success');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : TEXT.loadAlertFail);
          setLoading('error');
        });
    } else {
      fetchAdminUsers({ token })
        .then((data) => {
          setUsers(data.users);
          setError(null);
          setLoading('success');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : TEXT.loadUserFail);
          setLoading('error');
        });
    }
  }, [activeTab, statusFilter, token, isAdmin, alertSeverity, refreshKey]);

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <h2>{TEXT.needAdmin}</h2>
          <p>{TEXT.needAdminDesc}</p>
          <input
            type="password"
            placeholder={TEXT.tokenPlaceholder}
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <button type="button" onClick={() => setToken(token)}>
            {TEXT.tryLoad}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>{TEXT.headerTitle}</h1>
          <p>{TEXT.headerDesc}</p>
        </div>
        <button type="button" className="account-banner__link account-banner__link--muted" onClick={() => navigate('/app')}>
          {TEXT.back}
        </button>
      </header>

      <div className="admin-tabs">
        <button
          type="button"
          className={activeTab === 'payments' ? 'admin-tab admin-tab--active' : 'admin-tab'}
          onClick={() => setActiveTab('payments')}
        >
          {TEXT.tabPayments}
        </button>
        <button
          type="button"
          className={activeTab === 'subscriptions' ? 'admin-tab admin-tab--active' : 'admin-tab'}
          onClick={() => setActiveTab('subscriptions')}
        >
          {TEXT.tabSubscriptions}
        </button>
        <button
          type="button"
          className={activeTab === 'alerts' ? 'admin-tab admin-tab--active' : 'admin-tab'}
          onClick={() => setActiveTab('alerts')}
        >
          {TEXT.tabAlerts}
        </button>
        <button
          type="button"
          className={activeTab === 'users' ? 'admin-tab admin-tab--active' : 'admin-tab'}
          onClick={() => setActiveTab('users')}
        >
          {TEXT.tabUsers}
        </button>
      </div>

      {activeTab === 'payments' ? (
        <section className="admin-card">
          <div className="admin-toolbar">
            <label>
              {TEXT.statusFilter}
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">{TEXT.all}</option>
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="failed">failed</option>
                <option value="expired">expired</option>
              </select>
            </label>
            <button type="button" className="account-banner__link" onClick={() => setRefreshKey((count) => count + 1)}>
              {TEXT.refresh}
            </button>
          </div>
          {loading === 'loading' ? <p>{TEXT.loading}</p> : null}
          {error ? <div className="subscription-error">{error}</div> : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>{TEXT.table.orderId}</th>
                <th>{TEXT.table.status}</th>
                <th>{TEXT.table.provider}</th>
                <th>{TEXT.table.amount}</th>
                <th>{TEXT.table.user}</th>
                <th>{TEXT.table.plan}</th>
                <th>{TEXT.table.updatedAt}</th>
                <th style={{ minWidth: 180 }}>{TEXT.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((order) => (
                <tr key={order.id}>
                  <td>{order.out_trade_no}</td>
                  <td>{order.status}</td>
                  <td>{order.provider}</td>
                  <td>{`¥${(order.amount_cents / 100).toFixed(2)}`}</td>
                  <td>{order.user?.email ?? '--'}</td>
                  <td>{order.plan?.name ?? '--'}</td>
                  <td>{new Date(order.updated_at).toLocaleString()}</td>
                  <td>
                    <PaymentActions
                      order={order}
                      token={token}
                      onRefresh={() => setRefreshKey((count) => count + 1)}
                      onMessage={setMessage}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {message ? <p>{message}</p> : null}
        </section>
      ) : activeTab === 'subscriptions' ? (
        <section className="admin-card">
          {loading === 'loading' ? <p>{TEXT.loading}</p> : null}
          {error ? <div className="subscription-error">{error}</div> : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>{TEXT.table.orderId}</th>
                <th>{TEXT.table.userEmail}</th>
                <th>{TEXT.table.subPlan}</th>
                <th>{TEXT.table.subStatus}</th>
                <th>{TEXT.table.subExpire}</th>
                <th>{TEXT.table.alertAt}</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.user?.email ?? '--'}</td>
                  <td>{item.plan?.name ?? '--'}</td>
                  <td>{item.status}</td>
                  <td>{item.current_period_end ? new Date(item.current_period_end).toLocaleString() : '--'}</td>
                  <td>{item.trial_ends_at ? new Date(item.trial_ends_at).toLocaleString() : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : activeTab === 'alerts' ? (
        <section className="admin-card">
          <div className="admin-toolbar">
            <label>
              {lang === 'zh' ? '严重级别：' : 'Severity:'}
              <select value={alertSeverity} onChange={(event) => setAlertSeverity(event.target.value)}>
                <option value="">{TEXT.all}</option>
                <option value="critical">critical</option>
                <option value="warning">warning</option>
                <option value="info">info</option>
              </select>
            </label>
            <button type="button" className="account-banner__link" onClick={() => setRefreshKey((count) => count + 1)}>
              {TEXT.refresh}
            </button>
          </div>
          {loading === 'loading' ? <p>{TEXT.loading}</p> : null}
          {error ? <div className="subscription-error">{error}</div> : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>{TEXT.table.alertSeverity}</th>
                <th>{TEXT.table.alertMessage}</th>
                <th>{TEXT.table.alertMeta}</th>
                <th>{TEXT.table.alertMeta}</th>
                <th>{lang === 'zh' ? '触发次数' : 'Count'}</th>
                <th>{TEXT.table.alertAt}</th>
                <th>{lang === 'zh' ? '最后通知' : 'Last notified'}</th>
                <th>{lang === 'zh' ? '详情' : 'Details'}</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((item) => (
                <tr key={item.id}>
                  <td>{item.severity}</td>
                  <td>{item.message}</td>
                  <td>{item.source ?? '--'}</td>
                  <td>{item.tags.length ? item.tags.join(', ') : '--'}</td>
                  <td>{item.occurrences}</td>
                  <td>{new Date(item.lastTriggeredAt).toLocaleString()}</td>
                  <td>{item.lastNotifiedAt ? new Date(item.lastNotifiedAt).toLocaleString() : '--'}</td>
                  <td>
                    <details>
                      <summary>payload</summary>
                      <pre>{formatPayload(item.payload)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="admin-card">
          <div className="admin-toolbar">
            <span>{lang === 'zh' ? '用户列表' : 'User list'}</span>
            <button type="button" className="account-banner__link" onClick={() => setRefreshKey((count) => count + 1)}>
              {TEXT.refresh}
            </button>
          </div>
          {loading === 'loading' ? <p>{TEXT.loading}</p> : null}
          {error ? <div className="subscription-error">{error}</div> : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>{TEXT.table.userEmail}</th>
                <th>{lang === 'zh' ? '昵称' : 'Nickname'}</th>
                <th>{TEXT.table.userCreated}</th>
                <th>{TEXT.table.userStatus}</th>
                <th>{lang === 'zh' ? '会员到期' : 'Expire at'}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((info) => (
                <tr key={info.id}>
                  <td>{info.email}</td>
                  <td>{info.nickname ?? '--'}</td>
                  <td>{new Date(info.createdAt).toLocaleString()}</td>
                  <td>{info.membershipLabel}</td>
                  <td>
                    {info.membershipLabel === '非会员'
                      ? '--'
                      : info.membershipExpireAt
                      ? new Date(info.membershipExpireAt).toLocaleDateString()
                      : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

type PaymentActionsProps = {
  order: AdminPayment;
  token: string;
  onRefresh: () => void;
  onMessage: (message: string | null) => void;
};

function PaymentActions({ order, token, onRefresh, onMessage }: PaymentActionsProps): JSX.Element {
  if (order.status !== 'pending') {
    return <span>--</span>;
  }

  return (
    <div className="admin-actions">
      <button
        type="button"
        className="account-banner__link account-banner__link--primary"
        onClick={async () => {
          try {
            onMessage(lang === 'zh' ? '正在查单重试...' : 'Retrying payment...');
            await retryAdminPayment({ orderId: order.id, token });
            onMessage(lang === 'zh' ? '重试完成' : 'Retry done');
            onRefresh();
          } catch (err) {
            onMessage(err instanceof Error ? err.message : (lang === 'zh' ? '重试失败' : 'Retry failed'));
          }
        }}
      >
        {lang === 'zh' ? '查单重试' : 'Retry'}
      </button>
      <button
        type="button"
        className="account-banner__link account-banner__link--muted"
        onClick={async () => {
          const input = window.prompt(lang === 'zh' ? '标记失败原因（可为空）' : 'Reason for mark failed (optional)', 'ADMIN_MARK_FAILED');
          try {
            onMessage(lang === 'zh' ? '正在标记失败...' : 'Marking failed...');
            await failAdminPayment({
              orderId: order.id,
              token,
              reason: input?.trim() || undefined
            });
            onMessage(lang === 'zh' ? '已标记为失败' : 'Marked as failed');
            onRefresh();
          } catch (err) {
            onMessage(err instanceof Error ? err.message : (lang === 'zh' ? '标记失败出错' : 'Mark failed error'));
          }
        }}
      >
        {lang === 'zh' ? '标记失败' : 'Mark failed'}
      </button>
      <button
        type="button"
        className="account-banner__link account-banner__link--muted"
        onClick={async () => {
          const input = window.prompt(lang === 'zh' ? '标记过期原因（可为空）' : 'Reason to mark expired (optional)', 'ADMIN_EXPIRE');
          try {
            onMessage(lang === 'zh' ? '正在标记过期...' : 'Marking expired...');
            await expireAdminPayment({
              orderId: order.id,
              token,
              reason: input?.trim() || undefined
            });
            onMessage(lang === 'zh' ? '已标记为过期' : 'Marked as expired');
            onRefresh();
          } catch (err) {
            onMessage(err instanceof Error ? err.message : (lang === 'zh' ? '标记过期出错' : 'Mark expired error'));
          }
        }}
      >
        {lang === 'zh' ? '标记过期' : 'Mark expired'}
      </button>
    </div>
  );
}

function formatPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return typeof payload === 'string' ? payload : String(payload);
  }
}
