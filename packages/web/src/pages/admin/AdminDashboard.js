import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { expireAdminPayment, failAdminPayment, fetchAdminAlerts, fetchAdminPayments, fetchAdminSubscriptions, fetchAdminUsers, retryAdminPayment } from '../../services/admin';
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;
export function AdminDashboard() {
    const { user } = useAuth();
    const { t, lang } = useLanguage();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('payments');
    const [payments, setPayments] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [users, setUsers] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('');
    const [loading, setLoading] = useState('idle');
    const [error, setError] = useState(null);
    const [token, setToken] = useState(() => ADMIN_TOKEN ?? '');
    const [message, setMessage] = useState(null);
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
        }
        else if (activeTab === 'subscriptions') {
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
        }
        else if (activeTab === 'alerts') {
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
        }
        else {
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
        return (_jsx("div", { className: "admin-page", children: _jsxs("div", { className: "admin-card", children: [_jsx("h2", { children: TEXT.needAdmin }), _jsx("p", { children: TEXT.needAdminDesc }), _jsx("input", { type: "password", placeholder: TEXT.tokenPlaceholder, value: token, onChange: (event) => setToken(event.target.value) }), _jsx("button", { type: "button", onClick: () => setToken(token), children: TEXT.tryLoad })] }) }));
    }
    return (_jsxs("div", { className: "admin-page", children: [_jsxs("header", { className: "admin-header", children: [_jsxs("div", { children: [_jsx("h1", { children: TEXT.headerTitle }), _jsx("p", { children: TEXT.headerDesc })] }), _jsx("button", { type: "button", className: "account-banner__link account-banner__link--muted", onClick: () => navigate('/app'), children: TEXT.back })] }), _jsxs("div", { className: "admin-tabs", children: [_jsx("button", { type: "button", className: activeTab === 'payments' ? 'admin-tab admin-tab--active' : 'admin-tab', onClick: () => setActiveTab('payments'), children: TEXT.tabPayments }), _jsx("button", { type: "button", className: activeTab === 'subscriptions' ? 'admin-tab admin-tab--active' : 'admin-tab', onClick: () => setActiveTab('subscriptions'), children: TEXT.tabSubscriptions }), _jsx("button", { type: "button", className: activeTab === 'alerts' ? 'admin-tab admin-tab--active' : 'admin-tab', onClick: () => setActiveTab('alerts'), children: TEXT.tabAlerts }), _jsx("button", { type: "button", className: activeTab === 'users' ? 'admin-tab admin-tab--active' : 'admin-tab', onClick: () => setActiveTab('users'), children: TEXT.tabUsers })] }), activeTab === 'payments' ? (_jsxs("section", { className: "admin-card", children: [_jsxs("div", { className: "admin-toolbar", children: [_jsxs("label", { children: [TEXT.statusFilter, _jsxs("select", { value: statusFilter, onChange: (event) => setStatusFilter(event.target.value), children: [_jsx("option", { value: "", children: TEXT.all }), _jsx("option", { value: "pending", children: "pending" }), _jsx("option", { value: "paid", children: "paid" }), _jsx("option", { value: "failed", children: "failed" }), _jsx("option", { value: "expired", children: "expired" })] })] }), _jsx("button", { type: "button", className: "account-banner__link", onClick: () => setRefreshKey((count) => count + 1), children: TEXT.refresh })] }), loading === 'loading' ? _jsx("p", { children: TEXT.loading }) : null, error ? _jsx("div", { className: "subscription-error", children: error }) : null, _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: TEXT.table.orderId }), _jsx("th", { children: TEXT.table.status }), _jsx("th", { children: TEXT.table.provider }), _jsx("th", { children: TEXT.table.amount }), _jsx("th", { children: TEXT.table.user }), _jsx("th", { children: TEXT.table.plan }), _jsx("th", { children: TEXT.table.updatedAt }), _jsx("th", { style: { minWidth: 180 }, children: TEXT.table.actions })] }) }), _jsx("tbody", { children: payments.map((order) => (_jsxs("tr", { children: [_jsx("td", { children: order.out_trade_no }), _jsx("td", { children: order.status }), _jsx("td", { children: order.provider }), _jsx("td", { children: `¥${(order.amount_cents / 100).toFixed(2)}` }), _jsx("td", { children: order.user?.email ?? '--' }), _jsx("td", { children: order.plan?.name ?? '--' }), _jsx("td", { children: new Date(order.updated_at).toLocaleString() }), _jsx("td", { children: _jsx(PaymentActions, { order: order, token: token, onRefresh: () => setRefreshKey((count) => count + 1), onMessage: setMessage, lang: lang }) })] }, order.id))) })] }), message ? _jsx("p", { children: message }) : null] })) : activeTab === 'subscriptions' ? (_jsxs("section", { className: "admin-card", children: [loading === 'loading' ? _jsx("p", { children: TEXT.loading }) : null, error ? _jsx("div", { className: "subscription-error", children: error }) : null, _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: TEXT.table.orderId }), _jsx("th", { children: TEXT.table.userEmail }), _jsx("th", { children: TEXT.table.subPlan }), _jsx("th", { children: TEXT.table.subStatus }), _jsx("th", { children: TEXT.table.subExpire }), _jsx("th", { children: TEXT.table.alertAt })] }) }), _jsx("tbody", { children: subscriptions.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.id }), _jsx("td", { children: item.user?.email ?? '--' }), _jsx("td", { children: item.plan?.name ?? '--' }), _jsx("td", { children: item.status }), _jsx("td", { children: item.current_period_end ? new Date(item.current_period_end).toLocaleString() : '--' }), _jsx("td", { children: item.trial_ends_at ? new Date(item.trial_ends_at).toLocaleString() : '--' })] }, item.id))) })] })] })) : activeTab === 'alerts' ? (_jsxs("section", { className: "admin-card", children: [_jsxs("div", { className: "admin-toolbar", children: [_jsxs("label", { children: [lang === 'zh' ? '严重级别：' : 'Severity:', _jsxs("select", { value: alertSeverity, onChange: (event) => setAlertSeverity(event.target.value), children: [_jsx("option", { value: "", children: TEXT.all }), _jsx("option", { value: "critical", children: "critical" }), _jsx("option", { value: "warning", children: "warning" }), _jsx("option", { value: "info", children: "info" })] })] }), _jsx("button", { type: "button", className: "account-banner__link", onClick: () => setRefreshKey((count) => count + 1), children: TEXT.refresh })] }), loading === 'loading' ? _jsx("p", { children: TEXT.loading }) : null, error ? _jsx("div", { className: "subscription-error", children: error }) : null, _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: TEXT.table.alertSeverity }), _jsx("th", { children: TEXT.table.alertMessage }), _jsx("th", { children: TEXT.table.alertMeta }), _jsx("th", { children: TEXT.table.alertMeta }), _jsx("th", { children: lang === 'zh' ? '触发次数' : 'Count' }), _jsx("th", { children: TEXT.table.alertAt }), _jsx("th", { children: lang === 'zh' ? '最后通知' : 'Last notified' }), _jsx("th", { children: lang === 'zh' ? '详情' : 'Details' })] }) }), _jsx("tbody", { children: alerts.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.severity }), _jsx("td", { children: item.message }), _jsx("td", { children: item.source ?? '--' }), _jsx("td", { children: item.tags.length ? item.tags.join(', ') : '--' }), _jsx("td", { children: item.occurrences }), _jsx("td", { children: new Date(item.lastTriggeredAt).toLocaleString() }), _jsx("td", { children: item.lastNotifiedAt ? new Date(item.lastNotifiedAt).toLocaleString() : '--' }), _jsx("td", { children: _jsxs("details", { children: [_jsx("summary", { children: "payload" }), _jsx("pre", { children: formatPayload(item.payload) })] }) })] }, item.id))) })] })] })) : (_jsxs("section", { className: "admin-card", children: [_jsxs("div", { className: "admin-toolbar", children: [_jsx("span", { children: lang === 'zh' ? '用户列表' : 'User list' }), _jsx("button", { type: "button", className: "account-banner__link", onClick: () => setRefreshKey((count) => count + 1), children: TEXT.refresh })] }), loading === 'loading' ? _jsx("p", { children: TEXT.loading }) : null, error ? _jsx("div", { className: "subscription-error", children: error }) : null, _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: TEXT.table.userEmail }), _jsx("th", { children: lang === 'zh' ? '昵称' : 'Nickname' }), _jsx("th", { children: TEXT.table.userCreated }), _jsx("th", { children: TEXT.table.userStatus }), _jsx("th", { children: lang === 'zh' ? '会员到期' : 'Expire at' })] }) }), _jsx("tbody", { children: users.map((info) => (_jsxs("tr", { children: [_jsx("td", { children: info.email }), _jsx("td", { children: info.nickname ?? '--' }), _jsx("td", { children: new Date(info.createdAt).toLocaleString() }), _jsx("td", { children: info.membershipLabel }), _jsx("td", { children: info.membershipLabel === '非会员'
                                                ? '--'
                                                : info.membershipExpireAt
                                                    ? new Date(info.membershipExpireAt).toLocaleDateString()
                                                    : '--' })] }, info.id))) })] })] }))] }));
}
function PaymentActions({ order, token, onRefresh, onMessage, lang }) {
    if (order.status !== 'pending') {
        return _jsx("span", { children: "--" });
    }
    return (_jsxs("div", { className: "admin-actions", children: [_jsx("button", { type: "button", className: "account-banner__link account-banner__link--primary", onClick: async () => {
                    try {
                        onMessage(lang === 'zh' ? '正在查单重试...' : 'Retrying payment...');
                        await retryAdminPayment({ orderId: order.id, token });
                        onMessage(lang === 'zh' ? '重试完成' : 'Retry done');
                        onRefresh();
                    }
                    catch (err) {
                        onMessage(err instanceof Error ? err.message : (lang === 'zh' ? '重试失败' : 'Retry failed'));
                    }
                }, children: lang === 'zh' ? '查单重试' : 'Retry' }), _jsx("button", { type: "button", className: "account-banner__link account-banner__link--muted", onClick: async () => {
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
                    }
                    catch (err) {
                        onMessage(err instanceof Error ? err.message : (lang === 'zh' ? '标记失败出错' : 'Mark failed error'));
                    }
                }, children: lang === 'zh' ? '标记失败' : 'Mark failed' }), _jsx("button", { type: "button", className: "account-banner__link account-banner__link--muted", onClick: async () => {
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
                    }
                    catch (err) {
                        onMessage(err instanceof Error ? err.message : (lang === 'zh' ? '标记过期出错' : 'Mark expired error'));
                    }
                }, children: lang === 'zh' ? '标记过期' : 'Mark expired' })] }));
}
function formatPayload(payload) {
    try {
        return JSON.stringify(payload, null, 2);
    }
    catch {
        return typeof payload === 'string' ? payload : String(payload);
    }
}
