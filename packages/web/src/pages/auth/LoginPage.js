import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { login } from '../../services/auth';
export function LoginPage() {
    const navigate = useNavigate();
    const { setSession } = useAuth();
    const { t } = useLanguage();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const TEXT = t({
        zh: {
            title: '登录账号',
            subtitle: '请使用邮箱注册账号',
            noAccount: '还没有账号？',
            goRegister: '立即注册',
            email: '邮箱',
            password: '密码',
            placeholderEmail: 'name@example.com',
            placeholderPassword: '请输入密码',
            forgot: '忘记密码？',
            submit: '登录',
            submitting: '登录中...',
            error: '登录失败，请稍后重试'
        },
        en: {
            title: 'Log in',
            subtitle: 'Use your email to log in',
            noAccount: "Don't have an account?",
            goRegister: 'Sign up',
            email: 'Email',
            password: 'Password',
            placeholderEmail: 'name@example.com',
            placeholderPassword: 'Enter your password',
            forgot: 'Forgot password?',
            submit: 'Log in',
            submitting: 'Logging in...',
            error: 'Login failed, please try again'
        }
    });
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
            setError(err instanceof Error ? err.message : TEXT.error);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AuthLayout, { title: TEXT.title, subtitle: TEXT.subtitle, footer: _jsxs("div", { className: "auth-form__footer", children: [_jsx("span", { children: TEXT.noAccount }), _jsx(Link, { to: "/register", children: TEXT.goRegister })] }), children: _jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [error ? _jsx("div", { className: "auth-form__error", children: error }) : null, _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: TEXT.email }), _jsx("input", { type: "email", value: form.email, onChange: (event) => setForm((prev) => ({ ...prev, email: event.target.value })), placeholder: TEXT.placeholderEmail, autoComplete: "email", required: true })] }), _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: TEXT.password }), _jsx("input", { type: "password", value: form.password, onChange: (event) => setForm((prev) => ({ ...prev, password: event.target.value })), placeholder: TEXT.placeholderPassword, autoComplete: "current-password", required: true })] }), _jsx("div", { className: "auth-form__actions", children: _jsx(Link, { to: "/password/forgot", className: "auth-form__link", children: TEXT.forgot }) }), _jsx("button", { type: "submit", className: "auth-form__submit", disabled: loading, children: loading ? TEXT.submitting : TEXT.submit })] }) }));
}
