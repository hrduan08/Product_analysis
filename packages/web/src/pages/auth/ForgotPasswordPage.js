import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { requestPasswordReset } from '../../services/auth';
export function ForgotPasswordPage() {
    const { t, lang } = useLanguage();
    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const TEXT = t({
        zh: {
            title: '忘记密码',
            subtitle: '输入注册邮箱，我们会发送密码重置链接',
            footerLabel: '想起密码了？',
            footerLink: '返回登录',
            email: '邮箱',
            placeholder: 'name@example.com',
            submit: '发送重置邮件',
            submitting: '发送中...',
            success: '如果该邮箱存在，我们已发送重置密码邮件，请查收。',
            error: '发送失败，请稍后再试'
        },
        en: {
            title: 'Forgot password',
            subtitle: 'Enter your signup email, we will send a reset link',
            footerLabel: 'Remembered it?',
            footerLink: 'Back to login',
            email: 'Email',
            placeholder: 'name@example.com',
            submit: 'Send reset email',
            submitting: 'Sending...',
            success: 'If the email exists, we have sent a reset link. Please check your inbox.',
            error: 'Failed to send, please try again later'
        }
    });
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);
        try {
            await requestPasswordReset({ email: email.trim(), lang });
            setSuccess(TEXT.success);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : TEXT.error);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AuthLayout, { title: TEXT.title, subtitle: TEXT.subtitle, footer: _jsxs("div", { className: "auth-form__footer", children: [_jsx("span", { children: TEXT.footerLabel }), _jsx(Link, { to: "/login", children: TEXT.footerLink })] }), children: _jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [error ? _jsx("div", { className: "auth-form__error", children: error }) : null, success ? _jsx("div", { className: "auth-form__success", children: success }) : null, _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: TEXT.email }), _jsx("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), placeholder: TEXT.placeholder, autoComplete: "email", required: true })] }), _jsx("button", { type: "submit", className: "auth-form__submit", disabled: loading, children: loading ? TEXT.submitting : TEXT.submit })] }) }));
}
