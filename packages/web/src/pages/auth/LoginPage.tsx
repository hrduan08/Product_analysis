import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { login } from '../../services/auth';

type FormState = {
  email: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await login({
        email: form.email.trim(),
        password: form.password
      });
      setSession(session);
      navigate(session.user.emailVerified ? '/app' : '/verify-email', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="登录账号"
      subtitle="使用注册邮箱登录 Product Insight"
      footer={
        <div className="auth-form__footer">
          <span>还没有账号？</span>
          <Link to="/register">立即注册</Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="auth-form__error">{error}</div> : null}
        <label className="auth-form__field">
          <span>邮箱</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="auth-form__field">
          <span>密码</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="请输入密码"
            autoComplete="current-password"
            required
          />
        </label>
        <div className="auth-form__actions">
          <Link to="/password/forgot" className="auth-form__link">
            忘记密码？
          </Link>
        </div>
        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </AuthLayout>
  );
}
