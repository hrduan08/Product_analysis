import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { confirmPasswordReset } from '../../services/auth';
export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    if (!token) {
        return (_jsx(AuthLayout, { title: "\u91CD\u7F6E\u5BC6\u7801", subtitle: "\u94FE\u63A5\u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u7533\u8BF7", children: _jsxs("div", { className: "auth-notice", children: [_jsx("p", { children: "\u91CD\u7F6E\u94FE\u63A5\u7F3A\u5931\u6216\u5DF2\u5931\u6548\uFF0C\u8BF7\u8FD4\u56DE\u5FD8\u8BB0\u5BC6\u7801\u9875\u9762\u91CD\u65B0\u83B7\u53D6\u3002" }), _jsx("div", { className: "auth-notice__actions", children: _jsx(Link, { to: "/password/forgot", className: "auth-form__submit auth-form__submit--link", children: "\u91CD\u65B0\u7533\u8BF7\u91CD\u7F6E\u90AE\u4EF6" }) })] }) }));
    }
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        if (password.length < 8) {
            setError('密码至少 8 位长度');
            return;
        }
        if (password !== confirmPassword) {
            setError('两次密码输入不一致');
            return;
        }
        setLoading(true);
        try {
            await confirmPasswordReset({ token, password });
            setSuccess('密码重置成功，请使用新密码登录。');
            setPassword('');
            setConfirmPassword('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '重置失败，请稍后重试');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AuthLayout, { title: "\u8BBE\u7F6E\u65B0\u5BC6\u7801", subtitle: "\u8BF7\u8F93\u5165\u65B0\u5BC6\u7801\u5E76\u786E\u8BA4\u540E\u63D0\u4EA4", footer: _jsxs("div", { className: "auth-form__footer", children: [_jsx("span", { children: "\u91CD\u7F6E\u5B8C\u6210\u540E\uFF1F" }), _jsx(Link, { to: "/login", children: "\u8FD4\u56DE\u767B\u5F55" })] }), children: _jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [error ? _jsx("div", { className: "auth-form__error", children: error }) : null, success ? _jsx("div", { className: "auth-form__success", children: success }) : null, _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: "\u65B0\u5BC6\u7801" }), _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), placeholder: "\u81F3\u5C11 8 \u4F4D\uFF0C\u5EFA\u8BAE\u5305\u542B\u5B57\u6BCD\u4E0E\u6570\u5B57", autoComplete: "new-password", required: true })] }), _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: "\u786E\u8BA4\u65B0\u5BC6\u7801" }), _jsx("input", { type: "password", value: confirmPassword, onChange: (event) => setConfirmPassword(event.target.value), placeholder: "\u518D\u6B21\u8F93\u5165\u65B0\u5BC6\u7801", autoComplete: "new-password", required: true })] }), _jsx("button", { type: "submit", className: "auth-form__submit", disabled: loading, children: loading ? '提交中...' : '确认重置' })] }) }));
}
