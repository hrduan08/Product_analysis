import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { requestPasswordReset } from '../../services/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await requestPasswordReset({ email: email.trim() });
      setSuccess('如果该邮箱存在，我们已发送重置密码邮件，请查收。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="忘记密码"
      subtitle="输入注册邮箱，我们会发送密码重置链接"
      footer={
        <div className="auth-form__footer">
          <span>想起密码了？</span>
          <Link to="/login">返回登录</Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="auth-form__error">{error}</div> : null}
        {success ? <div className="auth-form__success">{success}</div> : null}
        <label className="auth-form__field">
          <span>邮箱</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </label>
        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? '发送中...' : '发送重置邮件'}
        </button>
      </form>
    </AuthLayout>
  );
}
