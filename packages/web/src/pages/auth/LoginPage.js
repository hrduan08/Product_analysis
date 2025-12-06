import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { login } from '../../services/auth';
export function LoginPage() {
    const navigate = useNavigate();
    const { setSession } = useAuth();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const session = await login({
                email: form.email.trim(),
                password: form.password
            });
            setSession(session);
            navigate(session.user.emailVerified ? '/app' : '/verify-email', { replace: true });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AuthLayout, { title: "\u767B\u5F55\u8D26\u53F7", subtitle: "\u4F7F\u7528\u6CE8\u518C\u90AE\u7BB1\u767B\u5F55 Product Insight", footer: _jsxs("div", { className: "auth-form__footer", children: [_jsx("span", { children: "\u8FD8\u6CA1\u6709\u8D26\u53F7\uFF1F" }), _jsx(Link, { to: "/register", children: "\u7ACB\u5373\u6CE8\u518C" })] }), children: _jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [error ? _jsx("div", { className: "auth-form__error", children: error }) : null, _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: "\u90AE\u7BB1" }), _jsx("input", { type: "email", value: form.email, onChange: (event) => setForm((prev) => ({ ...prev, email: event.target.value })), placeholder: "name@example.com", autoComplete: "email", required: true })] }), _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: "\u5BC6\u7801" }), _jsx("input", { type: "password", value: form.password, onChange: (event) => setForm((prev) => ({ ...prev, password: event.target.value })), placeholder: "\u8BF7\u8F93\u5165\u5BC6\u7801", autoComplete: "current-password", required: true })] }), _jsx("div", { className: "auth-form__actions", children: _jsx(Link, { to: "/password/forgot", className: "auth-form__link", children: "\u5FD8\u8BB0\u5BC6\u7801\uFF1F" }) }), _jsx("button", { type: "submit", className: "auth-form__submit", disabled: loading, children: loading ? '登录中...' : '登录' })] }) }));
}
