import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { verifyEmail } from '../../services/auth';

type Status = 'loading' | 'success' | 'error';

export function VerifyEmailCallbackPage() {
  const { updateUser } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | null>(null);

  const TEXT = t({
    zh: {
      title: '邮箱验证结果',
      subtitle: '根据提示完成后续操作',
      verifying: '正在验证链接，请稍候...',
      invalid: '验证链接无效或已过期',
      success: '邮箱验证成功，您现在可以登录并使用全部功能。',
      fail: '验证失败，请稍后再试',
      backLogin: '返回登录',
      resend: '重新发送验证邮件'
    },
    en: {
      title: 'Email verification',
      subtitle: 'Follow the tips to continue',
      verifying: 'Verifying your link, please wait...',
      invalid: 'Verification link is invalid or expired',
      success: 'Email verified successfully. You can now log in and use all features.',
      fail: 'Verification failed, please try again later',
      backLogin: 'Back to login',
      resend: 'Resend verification email'
    }
  });

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage(TEXT.invalid);
      return;
    }

    verifyEmail(token)
      .then((user) => {
        updateUser(user);
        setStatus('success');
        setMessage(TEXT.success);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : TEXT.fail);
      });
  }, [TEXT.fail, TEXT.invalid, TEXT.success, searchParams, updateUser]);

  return (
    <AuthLayout title={TEXT.title} subtitle={TEXT.subtitle}>
      <div className="auth-notice">
        <p>{message ?? TEXT.verifying}</p>
        {status === 'loading' ? null : (
          <div className="auth-notice__actions">
            {status === 'success' ? (
              <Link to="/login" className="auth-form__submit auth-form__submit--link">
                {TEXT.backLogin}
              </Link>
            ) : (
              <Link to="/verify-email" className="auth-form__submit auth-form__submit--link">
                {TEXT.resend}
              </Link>
            )}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
