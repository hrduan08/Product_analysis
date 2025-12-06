import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { verifyEmail } from '../../services/auth';
export function VerifyEmailCallbackPage() {
    const { updateUser } = useAuth();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('正在验证链接，请稍候...');
    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('验证链接无效或已过期');
            return;
        }
        verifyEmail(token)
            .then((user) => {
            updateUser(user);
            setStatus('success');
            setMessage('邮箱验证成功，您现在可以登录并使用全部功能。');
        })
            .catch((error) => {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : '验证失败，请稍后再试');
        });
    }, [searchParams, updateUser]);
    return (_jsx(AuthLayout, { title: "\u90AE\u7BB1\u9A8C\u8BC1\u7ED3\u679C", subtitle: "\u6839\u636E\u63D0\u793A\u5B8C\u6210\u540E\u7EED\u64CD\u4F5C", children: _jsxs("div", { className: "auth-notice", children: [_jsx("p", { children: message }), status === 'loading' ? null : (_jsx("div", { className: "auth-notice__actions", children: status === 'success' ? (_jsx(Link, { to: "/login", className: "auth-form__submit auth-form__submit--link", children: "\u8FD4\u56DE\u767B\u5F55" })) : (_jsx(Link, { to: "/verify-email", className: "auth-form__submit auth-form__submit--link", children: "\u91CD\u65B0\u53D1\u9001\u9A8C\u8BC1\u90AE\u4EF6" })) }))] }) }));
}
