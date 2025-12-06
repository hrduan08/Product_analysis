import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { register } from '../../services/auth';

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
  nickname: string;
  agree: boolean;
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    agree: true
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.agree) {
      setError('请先阅读并同意服务条款');
      return;
    }
    if (form.password.length < 8) {
      setError('密码至少 8 位长度');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        nickname: form.nickname.trim() || undefined
      };
      const session = await register(payload);
      setSession(session);
      navigate('/verify-email', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="创建账号"
      subtitle="注册后将自动开启 1 天试用"
      footer={
        <div className="auth-form__footer">
          <span>已经有账号？</span>
          <Link to="/login">立即登录</Link>
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
            placeholder="至少 8 位，建议包含字母与数字"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="auth-form__field">
          <span>确认密码</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
            placeholder="再次输入密码"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="auth-form__field">
          <span>昵称（选填）</span>
          <input
            type="text"
            value={form.nickname}
            onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))}
            placeholder="用于显示的称呼"
          />
        </label>
        <label className="auth-form__checkbox">
          <input
            type="checkbox"
            checked={form.agree}
            onChange={(event) => setForm((prev) => ({ ...prev, agree: event.target.checked }))}
          />
          <span>我已阅读并同意服务条款</span>
        </label>
        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? '提交中...' : '注册并开始试用'}
        </button>
      </form>
    </AuthLayout>
  );
}
