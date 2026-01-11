import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { resendVerificationEmail } from '../../services/auth';

export function VerifyEmailNoticePage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const TEXT = t({
    zh: {
      title: '验证您的邮箱',
      subtitle: (email: string) =>
        `我们已将验证邮件发送至 ${email}，请在验证邮件中点击验证链接，链接有效期 24 小时。`,
      footerTip: '已经完成验证？',
      backLogin: '返回登录',
      alert: '注意：如果收件箱没收到验证邮件，有可能被误识别为垃圾邮件了，请在“垃圾邮件”、“垃圾箱”或其他分类中检查一下。',
      resend: '重新发送验证邮件',
      resending: '发送中...',
      success: '验证邮件已重新发送，请检查收件箱或垃圾邮件文件夹。',
      fail: '发送失败，请稍后再试'
    },
    en: {
      title: 'Verify your email',
      subtitle: (email: string) =>
        `We have sent a verification email to ${email}, please click the link in your inbox. The link is valid for 24 hours.`,
      footerTip: 'Already verified?',
      backLogin: 'Back to login',
      alert: 'Note: If you cannot find it in your inbox, please check spam/junk or other folders.',
      resend: 'Resend verification email',
      resending: 'Sending...',
      success: 'Verification email resent. Please check inbox or spam folder.',
      fail: 'Failed to send, please try again later'
    }
  });

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
      await resendVerificationEmail({ email: user.email, lang });
      setStatus('success');
      setMessage(TEXT.success);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : TEXT.fail);
    }
  };

  return (
    <AuthLayout
      title={TEXT.title}
      subtitle={TEXT.subtitle(user.email)}
      footer={
        <div className="auth-form__footer">
          <span>{TEXT.footerTip}</span>
          <Link to="/login">{TEXT.backLogin}</Link>
        </div>
      }
    >
      <div className="auth-notice auth-notice--compact">
        <p className="auth-notice__alert" style={{ marginTop: 0, marginBottom: 0 }}>
          {TEXT.alert}
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
          {status === 'loading' ? TEXT.resending : TEXT.resend}
        </button>
      </div>
    </AuthLayout>
  );
}
