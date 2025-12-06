import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { register } from '../../services/auth';
export function RegisterPage() {
    const navigate = useNavigate();
    const { setSession } = useAuth();
    const [form, setForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        nickname: '',
        agree: true
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        if (!form.agree) {
            setError('请先阅读并同意服务条款');
            return;
        }
        if (form.password.length < 8) {
            setError('密码至少 8 位长度');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('两次密码输入不一致');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                email: form.email.trim(),
                password: form.password,
                nickname: form.nickname.trim() || undefined
            };
            const session = await register(payload);
            setSession(session);
            navigate('/verify-email', { replace: true });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : '注册失败，请稍后重试');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AuthLayout, { title: "\u521B\u5EFA\u8D26\u53F7", subtitle: "\u6CE8\u518C\u540E\u5C06\u81EA\u52A8\u5F00\u542F 1 \u5929\u8BD5\u7528", footer: _jsxs("div", { className: "auth-form__footer", children: [_jsx("span", { children: "\u5DF2\u7ECF\u6709\u8D26\u53F7\uFF1F" }), _jsx(Link, { to: "/login", children: "\u7ACB\u5373\u767B\u5F55" })] }), children: _jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [error ? _jsx("div", { className: "auth-form__error", children: error }) : null, _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: "\u90AE\u7BB1" }), _jsx("input", { type: "email", value: form.email, onChange: (event) => setForm((prev) => ({ ...prev, email: event.target.value })), placeholder: "name@example.com", autoComplete: "email", required: true })] }), _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: "\u5BC6\u7801" }), _jsx("input", { type: "password", value: form.password, onChange: (event) => setForm((prev) => ({ ...prev, password: event.target.value })), placeholder: "\u81F3\u5C11 8 \u4F4D\uFF0C\u5EFA\u8BAE\u5305\u542B\u5B57\u6BCD\u4E0E\u6570\u5B57", autoComplete: "new-password", required: true })] }), _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: "\u786E\u8BA4\u5BC6\u7801" }), _jsx("input", { type: "password", value: form.confirmPassword, onChange: (event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value })), placeholder: "\u518D\u6B21\u8F93\u5165\u5BC6\u7801", autoComplete: "new-password", required: true })] }), _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: "\u6635\u79F0\uFF08\u9009\u586B\uFF09" }), _jsx("input", { type: "text", value: form.nickname, onChange: (event) => setForm((prev) => ({ ...prev, nickname: event.target.value })), placeholder: "\u7528\u4E8E\u663E\u793A\u7684\u79F0\u547C" })] }), _jsxs("label", { className: "auth-form__checkbox", children: [_jsx("input", { type: "checkbox", checked: form.agree, onChange: (event) => setForm((prev) => ({ ...prev, agree: event.target.checked })) }), _jsx("span", { children: "\u6211\u5DF2\u9605\u8BFB\u5E76\u540C\u610F\u670D\u52A1\u6761\u6B3E" })] }), _jsx("button", { type: "submit", className: "auth-form__submit", disabled: loading, children: loading ? '提交中...' : '注册并开始试用' })] }) }));
}
