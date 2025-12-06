import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { confirmAdminPayment, fetchAdminPayments, fetchAdminUsers, type AdminPayment, type AdminUserInfo } from '../../services/admin';

const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';

export function AdminManualOrdersPage(): JSX.Element {
  const { user } = useAuth();
  const isSuperAdmin = user ? SUPER_ADMINS.includes((user.email ?? '').toLowerCase()) : false;
  const [pendingOrders, setPendingOrders] = useState<AdminPayment[]>([]);
  const [paidOrders, setPaidOrders] = useState<AdminPayment[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingPaid, setLoadingPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [token] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
  });

  useEffect(() => {
    if (!isSuperAdmin || !token) {
      return;
    }
    setLoadingPending(true);
    setError(null);
    fetchAdminPayments({ status: 'pending', token })
      .then((data) => {
        setPendingOrders(data.orders);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载待核实订单失败');
      })
      .finally(() => {
        setLoadingPending(false);
      });
  }, [isSuperAdmin, token, refreshKey]);

  useEffect(() => {
    if (!isSuperAdmin || !token) {
      return;
    }
    setLoadingPaid(true);
    fetchAdminPayments({ status: 'paid', token })
      .then((data) => {
        setPaidOrders(data.orders);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载已支付订单失败');
      })
      .finally(() => {
        setLoadingPaid(false);
      });
  }, [isSuperAdmin, token, refreshKey]);

  useEffect(() => {
    if (!isSuperAdmin || !token) {
      return;
    }
    setLoadingUsers(true);
    fetchAdminUsers({ token })
      .then((data) => {
        setUsers(data.users);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载用户信息失败');
      })
      .finally(() => setLoadingUsers(false));
  }, [isSuperAdmin, token, refreshKey]);

  const manualPendingOrders = useMemo(
    () => pendingOrders.filter((order) => ['mock', 'manual', 'wechat_personal'].includes(order.provider)),
    [pendingOrders]
  );
  const manualPaidOrders = useMemo(
    () => paidOrders.filter((order) => ['mock', 'manual', 'wechat_personal'].includes(order.provider)),
    [paidOrders]
  );

  const handleConfirm = async (orderId: string) => {
    if (!token) {
      setError('管理员密码缺失，请返回控制台重新输入。');
      return;
    }
    const targetOrder = manualPendingOrders.find((order) => order.id === orderId);
    try {
      setConfirmingId(orderId);
      await confirmAdminPayment({ orderId, token });
      if (targetOrder) {
        setPendingOrders((previous) => previous.filter((order) => order.id !== orderId));
        setPaidOrders((previous) => [{ ...targetOrder, status: 'paid', updated_at: new Date().toISOString() }, ...previous]);
      }
      setSuccess('已确认订单，并同步开通会员权限。');
      setError(null);
      setRefreshKey((count) => count + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : '确认支付失败';
      if (/paid/.test(message) && targetOrder) {
        setPendingOrders((previous) => previous.filter((order) => order.id !== orderId));
        setPaidOrders((previous) => [{ ...targetOrder, status: 'paid', updated_at: new Date().toISOString() }, ...previous]);
        setSuccess('该订单已处于已支付状态，已同步刷新列表。');
        setError(null);
        setRefreshKey((count) => count + 1);
      } else {
        setError(message);
        setSuccess(null);
      }
    }
    setConfirmingId(null);
  };

  if (!isSuperAdmin) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>管理平台</h1>
          <p>核对个人收款截图并手动开通会员；页面仅对客服/超级管理员开放。</p>
          {!token ? <p className="plan-meta">尚未检测到管理员密码，请返回控制台重新输入。</p> : null}
        </div>
        <a className="btn secondary" href="/app" style={{ textDecoration: 'none' }}>
          返回控制台
        </a>
      </header>

      <section className="subscription-card">
        <div className="subscription-hero__content" style={{ padding: 0 }}>
          <div>
            <h3>待核实订单</h3>
            <p className="plan-meta">收到用户付款截图 + 账号后，在此点击“确认支付”，系统随即开通会员并记录账单。</p>
          </div>
        </div>
        {loadingPending ? <p>加载中...</p> : null}
        {error ? <div className="subscription-error">{error}</div> : null}
        {success ? <div className="subscription-success">{success}</div> : null}
        <table className="task-table" style={{ marginTop: '12px' }}>
          <thead>
            <tr>
              <th>订单号</th>
              <th>账号邮箱</th>
              <th>套餐</th>
              <th>金额</th>
              <th>创建时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {manualPendingOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.out_trade_no}</td>
                <td>{order.user?.email ?? '--'}</td>
                <td>{order.plan?.name ?? '--'}</td>
                <td>{`¥${(order.amount_cents / 100).toFixed(2)}`}</td>
                <td>{new Date(order.updated_at).toLocaleString()}</td>
                <td>{order.status}</td>
                <td>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ marginRight: '8px' }}
                    onClick={() => void handleConfirm(order.id)}
                    disabled={loadingPending || confirmingId === order.id}
                  >
                    {confirmingId === order.id ? '确认中…' : '确认支付'}
                  </button>
                  <button type="button" className="btn text">
                    联系用户
                  </button>
                </td>
              </tr>
            ))}
            {manualPendingOrders.length === 0 && !loadingPending ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  暂无待核实订单
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="subscription-card">
        <div className="subscription-hero__content" style={{ padding: 0 }}>
          <div>
            <h3>已支付订单</h3>
            <p className="plan-meta">查看最近已确认的订单记录，便于核对与追溯。</p>
          </div>
        </div>
        {loadingPaid ? <p>加载中...</p> : null}
        <table className="task-table" style={{ marginTop: '12px' }}>
          <thead>
            <tr>
              <th>订单号</th>
              <th>账号邮箱</th>
              <th>套餐</th>
              <th>金额</th>
              <th>更新时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {manualPaidOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.out_trade_no}</td>
                <td>{order.user?.email ?? '--'}</td>
                <td>{order.plan?.name ?? '--'}</td>
                <td>{`¥${(order.amount_cents / 100).toFixed(2)}`}</td>
                <td>{new Date(order.updated_at).toLocaleString()}</td>
                <td>{order.status}</td>
              </tr>
            ))}
            {manualPaidOrders.length === 0 && !loadingPaid ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  暂无已支付订单
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="subscription-card">
        <div className="subscription-hero__content" style={{ padding: 0 }}>
          <div>
            <h3>用户信息</h3>
            <p className="plan-meta">查看所有注册账号及会员状态，便于运营核实。</p>
          </div>
          <button
            type="button"
            className="btn text"
            onClick={() => setRefreshKey((count) => count + 1)}
            disabled={loadingUsers}
          >
            {loadingUsers ? '刷新中…' : '刷新'}
          </button>
        </div>
        {loadingUsers ? <p>加载中...</p> : null}
        <table className="task-table" style={{ marginTop: '12px' }}>
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
            {users.length === 0 && !loadingUsers ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  暂无用户数据
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
