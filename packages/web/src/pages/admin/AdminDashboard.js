import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { expireAdminPayment, failAdminPayment, fetchAdminAlerts, fetchAdminPayments, fetchAdminSubscriptions, fetchAdminUsers, retryAdminPayment } from '../../services/admin';
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;
export function AdminDashboard() {
    const { user } = useAuth();
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
        }
        else if (activeTab === 'subscriptions') {
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
        }
        else if (activeTab === 'alerts') {
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
        }
        else {
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
        return (_jsx("div", { className: "admin-page", children: _jsxs("div", { className: "admin-card", children: [_jsx("h2", { children: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" }), _jsx("p", { children: "\u8BF7\u8054\u7CFB\u8FD0\u7EF4\u83B7\u53D6 `ADMIN_TOKEN`\uFF0C\u5728 `.env.local` \u4E2D\u8BBE\u7F6E `VITE_ADMIN_TOKEN` \u6216\u5728\u6B64\u8F93\u5165\u3002" }), _jsx("input", { type: "password", placeholder: "\u8F93\u5165\u7BA1\u7406\u5458\u4EE4\u724C", value: token, onChange: (event) => setToken(event.target.value) }), _jsx("button", { type: "button", onClick: () => setToken(token), children: "\u5C1D\u8BD5\u52A0\u8F7D" })] }) }));
    }
    return (_jsxs("div", { className: "admin-page", children: [_jsxs("header", { className: "admin-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "\u8FD0\u8425\u540E\u53F0" }), _jsx("p", { children: "\u67E5\u770B\u652F\u4ED8\u8BA2\u5355\u3001\u8BA2\u9605\u72B6\u6001\uFF0C\u5E76\u624B\u52A8\u5904\u7406\u5F02\u5E38\u3002" })] }), _jsx("button", { type: "button", className: "account-banner__link account-banner__link--muted", onClick: () => navigate('/app'), children: "\u8FD4\u56DE\u63A7\u5236\u53F0" })] }), _jsxs("div", { className: "admin-tabs", children: [_jsx("button", { type: "button", className: activeTab === 'payments' ? 'admin-tab admin-tab--active' : 'admin-tab', onClick: () => setActiveTab('payments'), children: "\u652F\u4ED8\u8BA2\u5355" }), _jsx("button", { type: "button", className: activeTab === 'subscriptions' ? 'admin-tab admin-tab--active' : 'admin-tab', onClick: () => setActiveTab('subscriptions'), children: "\u8BA2\u9605\u72B6\u6001" }), _jsx("button", { type: "button", className: activeTab === 'alerts' ? 'admin-tab admin-tab--active' : 'admin-tab', onClick: () => setActiveTab('alerts'), children: "\u544A\u8B66" }), _jsx("button", { type: "button", className: activeTab === 'users' ? 'admin-tab admin-tab--active' : 'admin-tab', onClick: () => setActiveTab('users'), children: "\u7528\u6237\u4FE1\u606F" })] }), activeTab === 'payments' ? (_jsxs("section", { className: "admin-card", children: [_jsxs("div", { className: "admin-toolbar", children: [_jsxs("label", { children: ["\u72B6\u6001\u7B5B\u9009\uFF1A", _jsxs("select", { value: statusFilter, onChange: (event) => setStatusFilter(event.target.value), children: [_jsx("option", { value: "", children: "\u5168\u90E8" }), _jsx("option", { value: "pending", children: "pending" }), _jsx("option", { value: "paid", children: "paid" }), _jsx("option", { value: "failed", children: "failed" }), _jsx("option", { value: "expired", children: "expired" })] })] }), _jsx("button", { type: "button", className: "account-banner__link", onClick: () => setRefreshKey((count) => count + 1), children: "\u5237\u65B0" })] }), loading === 'loading' ? _jsx("p", { children: "\u52A0\u8F7D\u4E2D..." }) : null, error ? _jsx("div", { className: "subscription-error", children: error }) : null, _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u8BA2\u5355ID" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u6E20\u9053" }), _jsx("th", { children: "\u91D1\u989D" }), _jsx("th", { children: "\u7528\u6237" }), _jsx("th", { children: "\u5957\u9910" }), _jsx("th", { children: "\u66F4\u65B0\u65F6\u95F4" }), _jsx("th", { style: { minWidth: 180 }, children: "\u64CD\u4F5C" })] }) }), _jsx("tbody", { children: payments.map((order) => (_jsxs("tr", { children: [_jsx("td", { children: order.out_trade_no }), _jsx("td", { children: order.status }), _jsx("td", { children: order.provider }), _jsx("td", { children: `¥${(order.amount_cents / 100).toFixed(2)}` }), _jsx("td", { children: order.user?.email ?? '--' }), _jsx("td", { children: order.plan?.name ?? '--' }), _jsx("td", { children: new Date(order.updated_at).toLocaleString() }), _jsx("td", { children: _jsx(PaymentActions, { order: order, token: token, onRefresh: () => setRefreshKey((count) => count + 1), onMessage: setMessage }) })] }, order.id))) })] }), message ? _jsx("p", { children: message }) : null] })) : activeTab === 'subscriptions' ? (_jsxs("section", { className: "admin-card", children: [loading === 'loading' ? _jsx("p", { children: "\u52A0\u8F7D\u4E2D..." }) : null, error ? _jsx("div", { className: "subscription-error", children: error }) : null, _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u8BA2\u9605ID" }), _jsx("th", { children: "\u90AE\u7BB1" }), _jsx("th", { children: "\u5957\u9910" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u5F53\u524D\u5468\u671F\u7ED3\u675F" }), _jsx("th", { children: "\u8BD5\u7528\u7ED3\u675F" })] }) }), _jsx("tbody", { children: subscriptions.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.id }), _jsx("td", { children: item.user?.email ?? '--' }), _jsx("td", { children: item.plan?.name ?? '--' }), _jsx("td", { children: item.status }), _jsx("td", { children: item.current_period_end ? new Date(item.current_period_end).toLocaleString() : '--' }), _jsx("td", { children: item.trial_ends_at ? new Date(item.trial_ends_at).toLocaleString() : '--' })] }, item.id))) })] })] })) : activeTab === 'alerts' ? (_jsxs("section", { className: "admin-card", children: [_jsxs("div", { className: "admin-toolbar", children: [_jsxs("label", { children: ["\u4E25\u91CD\u7EA7\u522B\uFF1A", _jsxs("select", { value: alertSeverity, onChange: (event) => setAlertSeverity(event.target.value), children: [_jsx("option", { value: "", children: "\u5168\u90E8" }), _jsx("option", { value: "critical", children: "critical" }), _jsx("option", { value: "warning", children: "warning" }), _jsx("option", { value: "info", children: "info" })] })] }), _jsx("button", { type: "button", className: "account-banner__link", onClick: () => setRefreshKey((count) => count + 1), children: "\u5237\u65B0" })] }), loading === 'loading' ? _jsx("p", { children: "\u52A0\u8F7D\u4E2D..." }) : null, error ? _jsx("div", { className: "subscription-error", children: error }) : null, _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u7EA7\u522B" }), _jsx("th", { children: "\u6D88\u606F" }), _jsx("th", { children: "\u6765\u6E90" }), _jsx("th", { children: "\u6807\u7B7E" }), _jsx("th", { children: "\u89E6\u53D1\u6B21\u6570" }), _jsx("th", { children: "\u6700\u540E\u89E6\u53D1" }), _jsx("th", { children: "\u6700\u540E\u901A\u77E5" }), _jsx("th", { children: "\u8BE6\u60C5" })] }) }), _jsx("tbody", { children: alerts.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.severity }), _jsx("td", { children: item.message }), _jsx("td", { children: item.source ?? '--' }), _jsx("td", { children: item.tags.length ? item.tags.join(', ') : '--' }), _jsx("td", { children: item.occurrences }), _jsx("td", { children: new Date(item.lastTriggeredAt).toLocaleString() }), _jsx("td", { children: item.lastNotifiedAt ? new Date(item.lastNotifiedAt).toLocaleString() : '--' }), _jsx("td", { children: _jsxs("details", { children: [_jsx("summary", { children: "payload" }), _jsx("pre", { children: formatPayload(item.payload) })] }) })] }, item.id))) })] })] })) : (_jsxs("section", { className: "admin-card", children: [_jsxs("div", { className: "admin-toolbar", children: [_jsx("span", { children: "\u7528\u6237\u5217\u8868" }), _jsx("button", { type: "button", className: "account-banner__link", onClick: () => setRefreshKey((count) => count + 1), children: "\u5237\u65B0" })] }), loading === 'loading' ? _jsx("p", { children: "\u52A0\u8F7D\u4E2D..." }) : null, error ? _jsx("div", { className: "subscription-error", children: error }) : null, _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u6CE8\u518C\u90AE\u7BB1" }), _jsx("th", { children: "\u6635\u79F0" }), _jsx("th", { children: "\u6CE8\u518C\u65F6\u95F4" }), _jsx("th", { children: "\u4F1A\u5458\u72B6\u6001" }), _jsx("th", { children: "\u4F1A\u5458\u5230\u671F" })] }) }), _jsx("tbody", { children: users.map((info) => (_jsxs("tr", { children: [_jsx("td", { children: info.email }), _jsx("td", { children: info.nickname ?? '--' }), _jsx("td", { children: new Date(info.createdAt).toLocaleString() }), _jsx("td", { children: info.membershipLabel }), _jsx("td", { children: info.membershipLabel === '非会员'
                                                ? '--'
                                                : info.membershipExpireAt
                                                    ? new Date(info.membershipExpireAt).toLocaleDateString()
                                                    : '--' })] }, info.id))) })] })] }))] }));
}
function PaymentActions({ order, token, onRefresh, onMessage }) {
    if (order.status !== 'pending') {
        return _jsx("span", { children: "--" });
    }
    return (_jsxs("div", { className: "admin-actions", children: [_jsx("button", { type: "button", className: "account-banner__link account-banner__link--primary", onClick: async () => {
                    try {
                        onMessage('正在查单重试...');
                        await retryAdminPayment({ orderId: order.id, token });
                        onMessage('重试完成');
                        onRefresh();
                    }
                    catch (err) {
                        onMessage(err instanceof Error ? err.message : '重试失败');
                    }
                }, children: "\u67E5\u5355\u91CD\u8BD5" }), _jsx("button", { type: "button", className: "account-banner__link account-banner__link--muted", onClick: async () => {
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
                    }
                    catch (err) {
                        onMessage(err instanceof Error ? err.message : '标记失败出错');
                    }
                }, children: "\u6807\u8BB0\u5931\u8D25" }), _jsx("button", { type: "button", className: "account-banner__link account-banner__link--muted", onClick: async () => {
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
                    }
                    catch (err) {
                        onMessage(err instanceof Error ? err.message : '标记过期出错');
                    }
                }, children: "\u6807\u8BB0\u8FC7\u671F" })] }));
}
function formatPayload(payload) {
    try {
        return JSON.stringify(payload, null, 2);
    }
    catch {
        return typeof payload === 'string' ? payload : String(payload);
    }
}
