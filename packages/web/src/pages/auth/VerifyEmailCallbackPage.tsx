import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { verifyEmail } from '../../services/auth';

type Status = 'loading' | 'success' | 'error';

export function VerifyEmailCallbackPage() {
  const { updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
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

  return (
    <AuthLayout title="邮箱验证结果" subtitle="根据提示完成后续操作">
      <div className="auth-notice">
        <p>{message}</p>
        {status === 'loading' ? null : (
          <div className="auth-notice__actions">
            {status === 'success' ? (
              <Link to="/login" className="auth-form__submit auth-form__submit--link">
                返回登录
              </Link>
            ) : (
              <Link to="/verify-email" className="auth-form__submit auth-form__submit--link">
                重新发送验证邮件
              </Link>
            )}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
