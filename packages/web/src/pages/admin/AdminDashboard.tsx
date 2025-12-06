import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
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

  const isAdmin = useMemo(() => {
    if (token && token.length > 0) {
      return true;
    }
    return user?.status === 'active' && user.email?.endsWith('@example.com');
  }, [token, user]);

  useEffect(() => {
    if (!isAdmin) {
      setError('管理员令牌未配置或权限不足');
    }
  }, [isAdmin]);

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
          setError(err instanceof Error ? err.message : '加载订单失败');
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
          setError(err instanceof Error ? err.message : '加载订阅失败');
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
          setError(err instanceof Error ? err.message : '加载告警失败');
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
          setError(err instanceof Error ? err.message : '加载用户信息失败');
          setLoading('error');
        });
    }
  }, [activeTab, statusFilter, token, isAdmin, alertSeverity, refreshKey]);

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <h2>需要管理员权限</h2>
          <p>请联系运维获取 `ADMIN_TOKEN`，在 `.env.local` 中设置 `VITE_ADMIN_TOKEN` 或在此输入。</p>
          <input
            type="password"
            placeholder="输入管理员令牌"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <button type="button" onClick={() => setToken(token)}>
            尝试加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>运营后台</h1>
          <p>查看支付订单、订阅状态，并手动处理异常。</p>
        </div>
        <button type="button" className="account-banner__link account-banner__link--muted" onClick={() => navigate('/app')}>
          返回控制台
        </button>
      </header>

      <div className="admin-tabs">
        <button
          type="button"
          className={activeTab === 'payments' ? 'admin-tab admin-tab--active' : 'admin-tab'}
          onClick={() => setActiveTab('payments')}
        >
          支付订单
        </button>
        <button
          type="button"
          className={activeTab === 'subscriptions' ? 'admin-tab admin-tab--active' : 'admin-tab'}
          onClick={() => setActiveTab('subscriptions')}
        >
          订阅状态
        </button>
        <button
          type="button"
          className={activeTab === 'alerts' ? 'admin-tab admin-tab--active' : 'admin-tab'}
          onClick={() => setActiveTab('alerts')}
        >
          告警
        </button>
        <button
          type="button"
          className={activeTab === 'users' ? 'admin-tab admin-tab--active' : 'admin-tab'}
          onClick={() => setActiveTab('users')}
        >
          用户信息
        </button>
      </div>

      {activeTab === 'payments' ? (
        <section className="admin-card">
          <div className="admin-toolbar">
            <label>
              状态筛选：
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">全部</option>
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="failed">failed</option>
                <option value="expired">expired</option>
              </select>
            </label>
            <button type="button" className="account-banner__link" onClick={() => setRefreshKey((count) => count + 1)}>
              刷新
            </button>
          </div>
          {loading === 'loading' ? <p>加载中...</p> : null}
          {error ? <div className="subscription-error">{error}</div> : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>订单ID</th>
                <th>状态</th>
                <th>渠道</th>
                <th>金额</th>
                <th>用户</th>
                <th>套餐</th>
                <th>更新时间</th>
                <th style={{ minWidth: 180 }}>操作</th>
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
          {loading === 'loading' ? <p>加载中...</p> : null}
          {error ? <div className="subscription-error">{error}</div> : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>订阅ID</th>
                <th>邮箱</th>
                <th>套餐</th>
                <th>状态</th>
                <th>当前周期结束</th>
                <th>试用结束</th>
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
              严重级别：
              <select value={alertSeverity} onChange={(event) => setAlertSeverity(event.target.value)}>
                <option value="">全部</option>
                <option value="critical">critical</option>
                <option value="warning">warning</option>
                <option value="info">info</option>
              </select>
            </label>
            <button type="button" className="account-banner__link" onClick={() => setRefreshKey((count) => count + 1)}>
              刷新
            </button>
          </div>
          {loading === 'loading' ? <p>加载中...</p> : null}
          {error ? <div className="subscription-error">{error}</div> : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>级别</th>
                <th>消息</th>
                <th>来源</th>
                <th>标签</th>
                <th>触发次数</th>
                <th>最后触发</th>
                <th>最后通知</th>
                <th>详情</th>
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
            <span>用户列表</span>
            <button type="button" className="account-banner__link" onClick={() => setRefreshKey((count) => count + 1)}>
              刷新
            </button>
          </div>
          {loading === 'loading' ? <p>加载中...</p> : null}
          {error ? <div className="subscription-error">{error}</div> : null}
          <table className="admin-table">
            <thead>
              <tr>
                <th>注册邮箱</th>
                <th>昵称</th>
                <th>注册时间</th>
                <th>会员状态</th>
                <th>会员到期</th>
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
            onMessage('正在查单重试...');
            await retryAdminPayment({ orderId: order.id, token });
            onMessage('重试完成');
            onRefresh();
          } catch (err) {
            onMessage(err instanceof Error ? err.message : '重试失败');
          }
        }}
      >
        查单重试
      </button>
      <button
        type="button"
        className="account-banner__link account-banner__link--muted"
        onClick={async () => {
          const input = window.prompt('标记失败原因（可为空）', 'ADMIN_MARK_FAILED');
          try {
            onMessage('正在标记失败...');
            await failAdminPayment({
              orderId: order.id,
              token,
              reason: input?.trim() || undefined
            });
            onMessage('已标记为失败');
            onRefresh();
          } catch (err) {
            onMessage(err instanceof Error ? err.message : '标记失败出错');
          }
        }}
      >
        标记失败
      </button>
      <button
        type="button"
        className="account-banner__link account-banner__link--muted"
        onClick={async () => {
          const input = window.prompt('标记过期原因（可为空）', 'ADMIN_EXPIRE');
          try {
            onMessage('正在标记过期...');
            await expireAdminPayment({
              orderId: order.id,
              token,
              reason: input?.trim() || undefined
            });
            onMessage('已标记为过期');
            onRefresh();
          } catch (err) {
            onMessage(err instanceof Error ? err.message : '标记过期出错');
          }
        }}
      >
        标记过期
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
