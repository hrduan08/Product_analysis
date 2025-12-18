import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { resendVerificationEmail } from '../../services/auth';

export function VerifyEmailNoticePage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.emailVerified) {
    return <Navigate to="/" replace />;
  }

  const handleResend = async () => {
    setStatus('loading');
    setMessage(null);
    try {
      await resendVerificationEmail({ email: user.email });
      setStatus('success');
      setMessage('验证邮件已重新发送，请检查收件箱或垃圾邮件文件夹。');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '发送失败，请稍后再试');
    }
  };

  return (
    <AuthLayout
      title="验证您的邮箱"
      subtitle={`我们已将验证邮件发送至 ${user.email}`}
      footer={
        <div className="auth-form__footer">
          <span>已经完成验证？</span>
          <Link to="/login">返回登录</Link>
        </div>
      }
    >
      <div className="auth-notice auth-notice--compact">
        <p>请前往邮箱点击验证链接，链接有效期 24 小时。</p>
        <p className="auth-notice__alert">
          <strong>注意：</strong>收件箱没看到，请检查“垃圾邮件/垃圾箱”或其他分类；若仍未收到，可稍后再试或点击下方按钮重新发送。
        </p>
        {message ? (
          <div
            className={`auth-notice__message auth-notice__message--${
              status === 'error' ? 'error' : 'success'
            }`}
          >
            {message}
          </div>
        ) : null}
        <button
          type="button"
          className="auth-form__submit"
          onClick={handleResend}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '发送中...' : '重新发送验证邮件'}
        </button>
      </div>
    </AuthLayout>
  );
}
