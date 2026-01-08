import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { confirmAdminPayment, fetchAdminPayments, fetchAdminUsers, type AdminPayment, type AdminUserInfo } from '../../services/admin';

const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';

export function AdminManualOrdersPage(): JSX.Element {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const TEXT = t({
    zh: {
      title: '管理平台',
      desc: '核对个人收款截图并手动开通会员；页面仅对客服/超级管理员开放。',
      noToken: '尚未检测到管理员密码，请返回控制台重新输入。',
      back: '返回控制台',
      pendingTitle: '待核实订单',
      pendingDesc: '收到用户付款截图 + 账号后，在此点击“确认支付”，系统随即开通会员并记录账单。',
      loading: '加载中...',
      errorPending: '加载待核实订单失败',
      errorPaid: '加载已支付订单失败',
      errorUsers: '加载用户信息失败',
      confirmFail: '确认支付失败',
      confirmDone: '已确认订单，并同步开通会员权限。',
      confirmAlready: '该订单已处于已支付状态，已同步刷新列表。',
      missingToken: '管理员密码缺失，请返回控制台重新输入。',
      btnConfirm: '确认支付',
      btnConfirming: '确认中…',
      btnContact: '联系用户',
      noPending: '暂无待核实订单',
      paidTitle: '已支付订单',
      paidDesc: '查看最近已确认的订单记录，便于核对与追溯。',
      noPaid: '暂无已支付订单',
      usersTitle: '用户信息',
      usersDesc: '查看所有注册账号及会员状态，便于运营核实。',
      btnRefresh: '刷新',
      btnRefreshing: '刷新中…',
      noUsers: '暂无用户数据',
      table: {
        orderId: '订单号',
        email: '账号邮箱',
        plan: '套餐',
        amount: '金额',
        created: '创建时间',
        updated: '更新时间',
        status: '状态',
        actions: '操作',
        nickname: '昵称',
        memberStatus: '会员状态',
        memberExpire: '会员到期'
      }
    },
    en: {
      title: 'Manual orders',
      desc: 'Verify personal payments and manually activate membership. For support/admin only.',
      noToken: 'Admin token not found, please re-enter from console.',
      back: 'Back to dashboard',
      pendingTitle: 'Pending orders',
      pendingDesc: 'After receiving payment screenshot + account, click “Confirm payment” here to activate membership.',
      loading: 'Loading...',
      errorPending: 'Failed to load pending orders',
      errorPaid: 'Failed to load paid orders',
      errorUsers: 'Failed to load users',
      confirmFail: 'Failed to confirm payment',
      confirmDone: 'Order confirmed and membership activated.',
      confirmAlready: 'Order already paid. List refreshed.',
      missingToken: 'Admin token missing, please re-enter from console.',
      btnConfirm: 'Confirm payment',
      btnConfirming: 'Confirming…',
      btnContact: 'Contact user',
      noPending: 'No pending orders',
      paidTitle: 'Paid orders',
      paidDesc: 'Recent confirmed orders for audit.',
      noPaid: 'No paid orders',
      usersTitle: 'Users',
      usersDesc: 'All accounts and membership status for ops check.',
      btnRefresh: 'Refresh',
      btnRefreshing: 'Refreshing…',
      noUsers: 'No users',
      table: {
        orderId: 'Order No.',
        email: 'Email',
        plan: 'Plan',
        amount: 'Amount',
        created: 'Created at',
        updated: 'Updated at',
        status: 'Status',
        actions: 'Actions',
        nickname: 'Nickname',
        memberStatus: 'Membership',
        memberExpire: 'Expire at'
      }
    }
  });
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
        setError(err instanceof Error ? err.message : TEXT.errorPending);
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
        setError(err instanceof Error ? err.message : TEXT.errorPaid);
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
        setError(err instanceof Error ? err.message : TEXT.errorUsers);
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
      setError(TEXT.missingToken);
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
      setSuccess(TEXT.confirmDone);
      setError(null);
      setRefreshKey((count) => count + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : TEXT.confirmFail;
      if (/paid/.test(message) && targetOrder) {
        setPendingOrders((previous) => previous.filter((order) => order.id !== orderId));
        setPaidOrders((previous) => [{ ...targetOrder, status: 'paid', updated_at: new Date().toISOString() }, ...previous]);
        setSuccess(TEXT.confirmAlready);
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
          <h1>{TEXT.title}</h1>
          <p>{TEXT.desc}</p>
          {!token ? <p className="plan-meta">{TEXT.noToken}</p> : null}
        </div>
        <a className="btn secondary" href="/app" style={{ textDecoration: 'none' }}>
          {TEXT.back}
        </a>
      </header>

      <section className="subscription-card">
        <div className="subscription-hero__content" style={{ padding: 0 }}>
          <div>
            <h3>{TEXT.pendingTitle}</h3>
            <p className="plan-meta">{TEXT.pendingDesc}</p>
          </div>
        </div>
        {loadingPending ? <p>{TEXT.loading}</p> : null}
        {error ? <div className="subscription-error">{error}</div> : null}
        {success ? <div className="subscription-success">{success}</div> : null}
        <table className="task-table" style={{ marginTop: '12px' }}>
          <thead>
            <tr>
              <th>{TEXT.table.orderId}</th>
              <th>{TEXT.table.email}</th>
              <th>{TEXT.table.plan}</th>
              <th>{TEXT.table.amount}</th>
              <th>{TEXT.table.created}</th>
              <th>{TEXT.table.status}</th>
              <th>{TEXT.table.actions}</th>
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
                  {confirmingId === order.id ? TEXT.btnConfirming : TEXT.btnConfirm}
                  </button>
                  <button type="button" className="btn text">
                    {TEXT.btnContact}
                  </button>
                </td>
              </tr>
            ))}
            {manualPendingOrders.length === 0 && !loadingPending ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  {TEXT.noPending}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="subscription-card">
        <div className="subscription-hero__content" style={{ padding: 0 }}>
          <div>
            <h3>{TEXT.paidTitle}</h3>
            <p className="plan-meta">{TEXT.paidDesc}</p>
          </div>
        </div>
        {loadingPaid ? <p>{TEXT.loading}</p> : null}
        <table className="task-table" style={{ marginTop: '12px' }}>
          <thead>
            <tr>
              <th>{TEXT.table.orderId}</th>
              <th>{TEXT.table.email}</th>
              <th>{TEXT.table.plan}</th>
              <th>{TEXT.table.amount}</th>
              <th>{TEXT.table.updated}</th>
              <th>{TEXT.table.status}</th>
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
                  {TEXT.noPaid}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="subscription-card">
        <div className="subscription-hero__content" style={{ padding: 0 }}>
          <div>
            <h3>{TEXT.usersTitle}</h3>
            <p className="plan-meta">{TEXT.usersDesc}</p>
          </div>
          <button
            type="button"
            className="btn text"
            onClick={() => setRefreshKey((count) => count + 1)}
            disabled={loadingUsers}
          >
            {loadingUsers ? TEXT.btnRefreshing : TEXT.btnRefresh}
          </button>
        </div>
        {loadingUsers ? <p>{TEXT.loading}</p> : null}
        <table className="task-table" style={{ marginTop: '12px' }}>
          <thead>
            <tr>
              <th>{TEXT.table.email}</th>
              <th>{TEXT.table.nickname}</th>
              <th>{TEXT.table.created}</th>
              <th>{TEXT.table.memberStatus}</th>
              <th>{TEXT.table.memberExpire}</th>
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
                  {TEXT.noUsers}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
