import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { confirmPasswordReset } from '../../services/auth';
export function ResetPasswordPage() {
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const TEXT = t({
        zh: {
            title: '重置密码',
            invalidSubtitle: '链接无效或已过期，请重新申请',
            invalidTip: '重置链接缺失或已失效，请返回忘记密码页面重新获取。',
            invalidAction: '重新申请重置邮件',
            setTitle: '设置新密码',
            setSubtitle: '请输入新密码并确认后提交',
            footerTip: '重置完成后？',
            footerLink: '返回登录',
            newPwd: '新密码',
            confirmPwd: '确认新密码',
            placeholderPwd: '至少 8 位，建议包含字母与数字',
            placeholderConfirm: '再次输入新密码',
            submit: '确认重置',
            submitting: '提交中...',
            errorLength: '密码至少 8 位长度',
            errorMismatch: '两次密码输入不一致',
            success: '密码重置成功，请使用新密码登录。',
            fail: '重置失败，请稍后重试'
        },
        en: {
            title: 'Reset password',
            invalidSubtitle: 'Link is invalid or expired. Please request again.',
            invalidTip: 'Reset link is missing or expired. Go back to request a new one.',
            invalidAction: 'Request reset email again',
            setTitle: 'Set a new password',
            setSubtitle: 'Enter and confirm your new password',
            footerTip: 'After reset?',
            footerLink: 'Back to login',
            newPwd: 'New password',
            confirmPwd: 'Confirm new password',
            placeholderPwd: 'At least 8 characters, include letters and numbers',
            placeholderConfirm: 'Re-enter new password',
            submit: 'Confirm reset',
            submitting: 'Submitting...',
            errorLength: 'Password must be at least 8 characters',
            errorMismatch: 'Passwords do not match',
            success: 'Password reset successfully. Please log in with the new password.',
            fail: 'Reset failed, please try again later'
        }
    });
    if (!token) {
        return (_jsx(AuthLayout, { title: TEXT.title, subtitle: TEXT.invalidSubtitle, children: _jsxs("div", { className: "auth-notice", children: [_jsx("p", { children: TEXT.invalidTip }), _jsx("div", { className: "auth-notice__actions", children: _jsx(Link, { to: "/password/forgot", className: "auth-form__submit auth-form__submit--link", children: TEXT.invalidAction }) })] }) }));
    }
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        if (password.length < 8) {
            setError(TEXT.errorLength);
            return;
        }
        if (password !== confirmPassword) {
            setError(TEXT.errorMismatch);
            return;
        }
        setLoading(true);
        try {
            await confirmPasswordReset({ token, password });
            setSuccess(TEXT.success);
            setPassword('');
            setConfirmPassword('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : TEXT.fail);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AuthLayout, { title: TEXT.setTitle, subtitle: TEXT.setSubtitle, footer: _jsxs("div", { className: "auth-form__footer", children: [_jsx("span", { children: TEXT.footerTip }), _jsx(Link, { to: "/login", children: TEXT.footerLink })] }), children: _jsxs("form", { className: "auth-form", onSubmit: handleSubmit, children: [error ? _jsx("div", { className: "auth-form__error", children: error }) : null, success ? _jsx("div", { className: "auth-form__success", children: success }) : null, _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: TEXT.newPwd }), _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), placeholder: TEXT.placeholderPwd, autoComplete: "new-password", required: true })] }), _jsxs("label", { className: "auth-form__field", children: [_jsx("span", { children: TEXT.confirmPwd }), _jsx("input", { type: "password", value: confirmPassword, onChange: (event) => setConfirmPassword(event.target.value), placeholder: TEXT.placeholderConfirm, autoComplete: "new-password", required: true })] }), _jsx("button", { type: "submit", className: "auth-form__submit", disabled: loading, children: loading ? TEXT.submitting : TEXT.submit })] }) }));
}
