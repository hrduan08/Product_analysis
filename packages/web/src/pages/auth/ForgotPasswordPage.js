import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { requestPasswordReset } from '../../services/auth';
export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);
        try {
            await requestPasswordReset({ email: email.trim() });
            setSuccess('如果该邮箱存在，我们已发送重置密码邮件，请查收。');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '发送失败，请稍后再试');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AuthLayout, { title: "\u5FD8\u8BB0\u5BC6\u7801", subtitle: "\u8F93\u5165\u6CE8\u518C\u90AE\u7BB1\uFF0C\u6211\u4EEC\u4F1A\u53D1\u9001\u5BC6\u7801\u91CD\u7F6E\u94FE\u63A5", footer: _jsxs("div", { className: "auth-form__footer", children: [_jsx("span", { children: "\u60F3\u8D77\u5BC6\u7801\u4E86\uFF1F" }), _jsx(Link, { to: "/login", children: "\u8FD4\u56DE\u767B\u5F55" })] }), children: _jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [error ? _jsx("div", { className: "auth-form__error", children: error }) : null, success ? _jsx("div", { className: "auth-form__success", children: success }) : null, _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: "\u90AE\u7BB1" }), _jsx("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), placeholder: "name@example.com", autoComplete: "email", required: true })] }), _jsx("button", { type: "submit", className: "auth-form__submit", disabled: loading, children: loading ? '发送中...' : '发送重置邮件' })] }) }));
}
