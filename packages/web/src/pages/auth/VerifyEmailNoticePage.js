import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { resendVerificationEmail } from '../../services/auth';
export function VerifyEmailNoticePage() {
    const { user } = useAuth();
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState(null);
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (user.emailVerified) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    const handleResend = async () => {
        setStatus('loading');
        setMessage(null);
        try {
            await resendVerificationEmail({ email: user.email });
            setStatus('success');
            setMessage('验证邮件已重新发送，请检查收件箱或垃圾邮件文件夹。');
        }
        catch (error) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : '发送失败，请稍后再试');
        }
    };
    return (_jsx(AuthLayout, { title: "\u9A8C\u8BC1\u60A8\u7684\u90AE\u7BB1", subtitle: `我们已将验证邮件发送至 ${user.email}`, footer: _jsxs("div", { className: "auth-form__footer", children: [_jsx("span", { children: "\u5DF2\u7ECF\u5B8C\u6210\u9A8C\u8BC1\uFF1F" }), _jsx(Link, { to: "/login", children: "\u8FD4\u56DE\u767B\u5F55" })] }), children: _jsxs("div", { className: "auth-notice", children: [_jsx("p", { children: "\u8BF7\u524D\u5F80\u90AE\u7BB1\u70B9\u51FB\u9A8C\u8BC1\u94FE\u63A5\uFF0C\u94FE\u63A5\u6709\u6548\u671F 24 \u5C0F\u65F6\u3002" }), _jsx("p", { children: "\u5982\u679C\u957F\u65F6\u95F4\u672A\u6536\u5230\uFF0C\u53EF\u4EE5\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u91CD\u65B0\u53D1\u9001\u3002" }), message ? (_jsx("div", { className: `auth-notice__message auth-notice__message--${status === 'error' ? 'error' : 'success'}`, children: message })) : null, _jsx("button", { type: "button", className: "auth-form__submit", onClick: handleResend, disabled: status === 'loading', children: status === 'loading' ? '发送中...' : '重新发送验证邮件' })] }) }));
}
