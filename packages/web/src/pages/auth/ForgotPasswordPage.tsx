import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { AuthLayout } from '../../components/AuthLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import { requestPasswordReset } from '../../services/auth';

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const TEXT = t({
    zh: {
      title: '忘记密码',
      subtitle: '输入注册邮箱，我们会发送密码重置链接',
      footerLabel: '想起密码了？',
      footerLink: '返回登录',
      email: '邮箱',
      placeholder: 'name@example.com',
      submit: '发送重置邮件',
      submitting: '发送中...',
      success: '如果该邮箱存在，我们已发送重置密码邮件，请查收。',
      error: '发送失败，请稍后再试'
    },
    en: {
      title: 'Forgot password',
      subtitle: 'Enter your signup email, we will send a reset link',
      footerLabel: 'Remembered it?',
      footerLink: 'Back to login',
      email: 'Email',
      placeholder: 'name@example.com',
      submit: 'Send reset email',
      submitting: 'Sending...',
      success: 'If the email exists, we have sent a reset link. Please check your inbox.',
      error: 'Failed to send, please try again later'
    }
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await requestPasswordReset({ email: email.trim(), lang: t({ zh: 'zh', en: 'en' }) });
      setSuccess(TEXT.success);
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
          <span>{TEXT.footerLabel}</span>
          <Link to="/login">{TEXT.footerLink}</Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="auth-form__error">{error}</div> : null}
        {success ? <div className="auth-form__success">{success}</div> : null}
        <label className="auth-form__field">
          <span>{TEXT.email}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={TEXT.placeholder}
            autoComplete="email"
            required
          />
        </label>
        <button type="submit" className="auth-form__submit" disabled={loading}>
          {loading ? TEXT.submitting : TEXT.submit}
        </button>
      </form>
    </AuthLayout>
  );
}
