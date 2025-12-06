import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { confirmPasswordReset } from '../../services/auth';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthLayout title="重置密码" subtitle="链接无效或已过期，请重新申请">
        <div className="auth-notice">
          <p>重置链接缺失或已失效，请返回忘记密码页面重新获取。</p>
          <div className="auth-notice__actions">
            <Link to="/password/forgot" className="auth-form__submit auth-form__submit--link">
              重新申请重置邮件
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('密码至少 8 位长度');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({ token, password });
      setSuccess('密码重置成功，请使用新密码登录。');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="设置新密码"
      subtitle="请输入新密码并确认后提交"
      footer={
        <div className="auth-form__footer">
          <span>重置完成后？</span>
          <Link to="/login">返回登录</Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="auth-form__error">{error}</div> : null}
        {success ? <div className="auth-form__success">{success}</div> : null}
        <label className="auth-form__field">
          <span>新密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位，建议包含字母与数字"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="auth-form__field">
          <span>确认新密码</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="再次输入新密码"
            autoComplete="new-password"
            required
          />
        </label>
        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? '提交中...' : '确认重置'}
        </button>
      </form>
    </AuthLayout>
  );
}
