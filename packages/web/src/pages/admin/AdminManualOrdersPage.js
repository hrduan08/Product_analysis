import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { confirmAdminPayment, fetchAdminPayments } from '../../services/admin';
const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';
export function AdminManualOrdersPage() {
    const { user } = useAuth();
    const isSuperAdmin = user ? SUPER_ADMINS.includes((user.email ?? '').toLowerCase()) : false;
    const [pendingOrders, setPendingOrders] = useState([]);
    const [paidOrders, setPaidOrders] = useState([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [loadingPaid, setLoadingPaid] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [confirmingId, setConfirmingId] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [token] = useState(() => {
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
    const manualPendingOrders = useMemo(() => pendingOrders.filter((order) => order.provider === 'mock' || order.provider === 'manual'), [pendingOrders]);
    const manualPaidOrders = useMemo(() => paidOrders.filter((order) => order.provider === 'mock' || order.provider === 'manual'), [paidOrders]);
    const handleConfirm = async (orderId) => {
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
        }
        catch (err) {
            const message = err instanceof Error ? err.message : '确认支付失败';
            if (/paid/.test(message) && targetOrder) {
                setPendingOrders((previous) => previous.filter((order) => order.id !== orderId));
                setPaidOrders((previous) => [{ ...targetOrder, status: 'paid', updated_at: new Date().toISOString() }, ...previous]);
                setSuccess('该订单已处于已支付状态，已同步刷新列表。');
                setError(null);
                setRefreshKey((count) => count + 1);
            }
            else {
                setError(message);
                setSuccess(null);
            }
        }
        setConfirmingId(null);
    };
    if (!isSuperAdmin) {
        return _jsx(Navigate, { to: "/app", replace: true });
    }
    return (_jsxs("div", { className: "admin-page", children: [_jsxs("header", { className: "admin-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "\u7BA1\u7406\u5E73\u53F0" }), _jsx("p", { children: "\u6838\u5BF9\u4E2A\u4EBA\u6536\u6B3E\u622A\u56FE\u5E76\u624B\u52A8\u5F00\u901A\u4F1A\u5458\uFF1B\u9875\u9762\u4EC5\u5BF9\u5BA2\u670D/\u8D85\u7EA7\u7BA1\u7406\u5458\u5F00\u653E\u3002" }), !token ? _jsx("p", { className: "plan-meta", children: "\u5C1A\u672A\u68C0\u6D4B\u5230\u7BA1\u7406\u5458\u5BC6\u7801\uFF0C\u8BF7\u8FD4\u56DE\u63A7\u5236\u53F0\u91CD\u65B0\u8F93\u5165\u3002" }) : null] }), _jsx("a", { className: "btn secondary", href: "/app", style: { textDecoration: 'none' }, children: "\u8FD4\u56DE\u63A7\u5236\u53F0" })] }), _jsxs("section", { className: "subscription-card", children: [_jsx("div", { className: "subscription-hero__content", style: { padding: 0 }, children: _jsxs("div", { children: [_jsx("h3", { children: "\u5F85\u6838\u5B9E\u8BA2\u5355" }), _jsx("p", { className: "plan-meta", children: "\u6536\u5230\u7528\u6237\u4ED8\u6B3E\u622A\u56FE + \u8D26\u53F7\u540E\uFF0C\u5728\u6B64\u70B9\u51FB\u201C\u786E\u8BA4\u652F\u4ED8\u201D\uFF0C\u7CFB\u7EDF\u968F\u5373\u5F00\u901A\u4F1A\u5458\u5E76\u8BB0\u5F55\u8D26\u5355\u3002" })] }) }), loadingPending ? _jsx("p", { children: "\u52A0\u8F7D\u4E2D..." }) : null, error ? _jsx("div", { className: "subscription-error", children: error }) : null, success ? _jsx("div", { className: "subscription-success", children: success }) : null, _jsxs("table", { className: "task-table", style: { marginTop: '12px' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u8BA2\u5355\u53F7" }), _jsx("th", { children: "\u8D26\u53F7\u90AE\u7BB1" }), _jsx("th", { children: "\u5957\u9910" }), _jsx("th", { children: "\u91D1\u989D" }), _jsx("th", { children: "\u521B\u5EFA\u65F6\u95F4" }), _jsx("th", { children: "\u72B6\u6001" }), _jsx("th", { children: "\u64CD\u4F5C" })] }) }), _jsxs("tbody", { children: [manualPendingOrders.map((order) => (_jsxs("tr", { children: [_jsx("td", { children: order.out_trade_no }), _jsx("td", { children: order.user?.email ?? '--' }), _jsx("td", { children: order.plan?.name ?? '--' }), _jsx("td", { children: `¥${(order.amount_cents / 100).toFixed(2)}` }), _jsx("td", { children: new Date(order.updated_at).toLocaleString() }), _jsx("td", { children: order.status }), _jsxs("td", { children: [_jsx("button", { type: "button", className: "btn secondary", style: { marginRight: '8px' }, onClick: () => void handleConfirm(order.id), disabled: loadingPending || confirmingId === order.id, children: confirmingId === order.id ? '确认中…' : '确认支付' }), _jsx("button", { type: "button", className: "btn text", children: "\u8054\u7CFB\u7528\u6237" })] })] }, order.id))), manualPendingOrders.length === 0 && !loadingPending ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, style: { textAlign: 'center', color: '#94a3b8' }, children: "\u6682\u65E0\u5F85\u6838\u5B9E\u8BA2\u5355" }) })) : null] })] })] }), _jsxs("section", { className: "subscription-card", children: [_jsx("div", { className: "subscription-hero__content", style: { padding: 0 }, children: _jsxs("div", { children: [_jsx("h3", { children: "\u5DF2\u652F\u4ED8\u8BA2\u5355" }), _jsx("p", { className: "plan-meta", children: "\u67E5\u770B\u6700\u8FD1\u5DF2\u786E\u8BA4\u7684\u8BA2\u5355\u8BB0\u5F55\uFF0C\u4FBF\u4E8E\u6838\u5BF9\u4E0E\u8FFD\u6EAF\u3002" })] }) }), loadingPaid ? _jsx("p", { children: "\u52A0\u8F7D\u4E2D..." }) : null, _jsxs("table", { className: "task-table", style: { marginTop: '12px' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u8BA2\u5355\u53F7" }), _jsx("th", { children: "\u8D26\u53F7\u90AE\u7BB1" }), _jsx("th", { children: "\u5957\u9910" }), _jsx("th", { children: "\u91D1\u989D" }), _jsx("th", { children: "\u66F4\u65B0\u65F6\u95F4" }), _jsx("th", { children: "\u72B6\u6001" })] }) }), _jsxs("tbody", { children: [manualPaidOrders.map((order) => (_jsxs("tr", { children: [_jsx("td", { children: order.out_trade_no }), _jsx("td", { children: order.user?.email ?? '--' }), _jsx("td", { children: order.plan?.name ?? '--' }), _jsx("td", { children: `¥${(order.amount_cents / 100).toFixed(2)}` }), _jsx("td", { children: new Date(order.updated_at).toLocaleString() }), _jsx("td", { children: order.status })] }, order.id))), manualPaidOrders.length === 0 && !loadingPaid ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, style: { textAlign: 'center', color: '#94a3b8' }, children: "\u6682\u65E0\u5DF2\u652F\u4ED8\u8BA2\u5355" }) })) : null] })] })] })] }));
}
