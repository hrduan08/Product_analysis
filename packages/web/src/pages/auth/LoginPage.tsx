import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { login } from '../../services/auth';

type FormState = {
  email: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const TEXT = t({
    zh: {
      title: '登录账号',
      subtitle: '请使用邮箱注册账号',
      noAccount: '还没有账号？',
      goRegister: '立即注册',
      email: '邮箱',
      password: '密码',
      placeholderEmail: 'name@example.com',
      placeholderPassword: '请输入密码',
      forgot: '忘记密码？',
      submit: '登录',
      submitting: '登录中...',
      error: '登录失败，请稍后重试'
    },
    en: {
      title: 'Log in',
      subtitle: 'Use your email to log in',
      noAccount: "Don't have an account?",
      goRegister: 'Sign up',
      email: 'Email',
      password: 'Password',
      placeholderEmail: 'name@example.com',
      placeholderPassword: 'Enter your password',
      forgot: 'Forgot password?',
      submit: 'Log in',
      submitting: 'Logging in...',
      error: 'Login failed, please try again'
    }
  });

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
      setError(err instanceof Error ? err.message : TEXT.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={TEXT.title}
      subtitle={TEXT.subtitle}
      footer={
        <div className="auth-form__footer">
          <span>{TEXT.noAccount}</span>
          <Link to="/register">{TEXT.goRegister}</Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="auth-form__error">{error}</div> : null}
        <label className="auth-form__field">
          <span>{TEXT.email}</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder={TEXT.placeholderEmail}
            autoComplete="email"
            required
          />
        </label>
        <label className="auth-form__field">
          <span>{TEXT.password}</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder={TEXT.placeholderPassword}
            autoComplete="current-password"
            required
          />
        </label>
        <div className="auth-form__actions">
          <Link to="/password/forgot" className="auth-form__link">
            {TEXT.forgot}
          </Link>
        </div>
        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? TEXT.submitting : TEXT.submit}
        </button>
      </form>
    </AuthLayout>
  );
}
