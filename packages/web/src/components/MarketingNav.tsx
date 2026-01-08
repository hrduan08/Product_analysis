import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const USER_STATUS_LABEL: Record<string, string> = {
  trialing: '试用中',
  active: '已订阅',
  past_due: '待续费',
  canceled: '已取消'
};
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function MarketingNav() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const navText = lang === 'zh'
    ? { login: '登录', register: '注册', dashboard: '控制台', langLabel: '语言', zh: '中文', en: 'English' }
    : { login: 'Log in', register: 'Sign up', dashboard: 'Dashboard', langLabel: 'Language', zh: 'Chinese', en: 'English' };

  const accountStatusLabel = useMemo(() => {
    if (!user) return null;
    return USER_STATUS_LABEL[user.status] ?? user.status;
  }, [user]);

  const trialInfo = useMemo(() => {
    if (!user || user.status !== 'trialing' || !user.trialEndsAt) {
      return null as null;
    }
    const endsAt = new Date(user.trialEndsAt);
    if (Number.isNaN(endsAt.getTime())) {
      return null as null;
    }
    const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
    return diffDays > 0 ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）` : `试用已到期（${endsAt.toLocaleDateString()}）`;
  }, [user]);

  const handleStartTrial = () => {
    if (user) {
      navigate('/app');
      return;
    }
    navigate('/register');
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
    } finally {
      setLogoutLoading(false);
      setMenuOpen(false);
    }
  };

  return (
    <div className="nav-bar">
      <div className="shell nav-inner">
        <div className="nav-left">
          <Link className="logo-mark" to="/">
            <img src="/assets/logos/logo.png" alt="VoiceInsight" className="logo-img" />
            <span className="logo-word">
              Voice<span className="logo-word__accent">Insight</span>
            </span>
          </Link>
        </div>
        <div className="nav-actions">
          <div className="nav-lang">
            <button type="button" className="btn text" onClick={() => setLangOpen((v) => !v)}>
              {navText.langLabel}
            </button>
            {langOpen ? (
              <div className="nav-lang__menu">
                <button
                  type="button"
                  className={`nav-lang__item${lang === 'zh' ? ' is-active' : ''}`}
                  onClick={() => {
                    setLang('zh');
                    setLangOpen(false);
                  }}
                >
                  {navText.zh}
                </button>
                <button
                  type="button"
                  className={`nav-lang__item${lang === 'en' ? ' is-active' : ''}`}
                  onClick={() => {
                    setLang('en');
                    setLangOpen(false);
                  }}
                >
                  {navText.en}
                </button>
              </div>
            ) : null}
          </div>
          {user ? (
            <>
              <Link className="btn" to="/app">
                {navText.dashboard}
              </Link>
              <div className="nav-avatar-wrapper">
                <button
                  type="button"
                  className="dashboard-avatar"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-label="打开账号入口"
                >
                  {(user.email?.[0] ?? 'U').toUpperCase()}
                </button>
                {menuOpen ? (
                  <div className="account-popover account-popover--nav">
                    <div className="account-popover__header">
                      <strong>{user.email}</strong>
                    </div>
                    {accountStatusLabel ? (
                      <p className="account-popover__status">账户状态：{accountStatusLabel}</p>
                    ) : null}
                    {trialInfo ? <p className="account-popover__status">{trialInfo}</p> : null}
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={handleLogout}
                      disabled={logoutLoading}
                    >
                      {logoutLoading ? '退出中...' : '退出登录'}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link className="btn" to="/login">
                {navText.login}
              </Link>
              <button type="button" className="btn primary" onClick={handleStartTrial}>
                {navText.register}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
