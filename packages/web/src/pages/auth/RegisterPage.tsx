import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
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
  const { t } = useLanguage();
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    agree: true
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const TEXT = t({
    zh: {
      title: '创建账号',
      subtitle: '注册后将自动开启 1 天试用',
      hasAccount: '已经有账号？',
      goLogin: '立即登录',
      email: '邮箱',
      password: '密码',
      confirm: '确认密码',
      nickname: '昵称（选填）',
      agree: '我已阅读并同意服务条款',
      placeholderEmail: 'name@example.com',
      placeholderPwd: '至少 8 位，建议包含字母与数字',
      placeholderConfirm: '再次输入密码',
      placeholderNickname: '用于显示的称呼',
      submit: '注册并开始试用',
      submitting: '提交中...',
      errorFail: '注册失败，请稍后重试',
      errorAgree: '请先阅读并同意服务条款',
      errorLength: '密码至少 8 位长度',
      errorMismatch: '两次密码输入不一致'
    },
    en: {
      title: 'Create account',
      subtitle: 'Start a 1-day trial automatically after signup',
      hasAccount: 'Already have an account?',
      goLogin: 'Log in',
      email: 'Email',
      password: 'Password',
      confirm: 'Confirm password',
      nickname: 'Nickname (optional)',
      agree: 'I agree to the Terms of Service',
      placeholderEmail: 'name@example.com',
      placeholderPwd: 'At least 8 characters, include letters and numbers',
      placeholderConfirm: 'Enter password again',
      placeholderNickname: 'Display name',
      submit: 'Sign up & start trial',
      submitting: 'Submitting...',
      errorFail: 'Registration failed, please try again',
      errorAgree: 'Please accept the Terms of Service first',
      errorLength: 'Password must be at least 8 characters',
      errorMismatch: 'Passwords do not match'
    }
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.agree) {
      setError(TEXT.errorAgree);
      return;
    }
    if (form.password.length < 8) {
      setError(TEXT.errorLength);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(TEXT.errorMismatch);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        nickname: form.nickname.trim() || undefined,
        lang: t({ zh: 'zh', en: 'en' })
      };
      const session = await register(payload);
      setSession(session);
      navigate('/verify-email', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXT.errorFail);
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
          <span>{TEXT.hasAccount}</span>
          <Link to="/login">{TEXT.goLogin}</Link>
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
            placeholder={TEXT.placeholderPwd}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="auth-form__field">
          <span>{TEXT.confirm}</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
            placeholder={TEXT.placeholderConfirm}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="auth-form__field">
          <span>{TEXT.nickname}</span>
          <input
            type="text"
            value={form.nickname}
            onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))}
            placeholder={TEXT.placeholderNickname}
          />
        </label>
        <label className="auth-form__checkbox">
          <input
            type="checkbox"
            checked={form.agree}
            onChange={(event) => setForm((prev) => ({ ...prev, agree: event.target.checked }))}
          />
          <span>{TEXT.agree}</span>
        </label>
        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? TEXT.submitting : TEXT.submit}
        </button>
      </form>
    </AuthLayout>
  );
}
