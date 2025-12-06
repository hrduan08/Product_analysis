import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

const USER_STATUS_LABEL: Record<string, string> = {
  trialing: '试用中',
  active: '已订阅',
  past_due: '待续费',
  canceled: '已取消'
};
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function MarketingNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

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
            <span>PI</span>Product Insight
          </Link>
          <div className="nav-menu">
            <a href="/#features">产品功能</a>
            <a href="/#usecases">行业方案</a>
            <a href="/#resources">资源中心</a>
            <Link className="nav-link" to="/pricing">
              会员价格
            </Link>
          </div>
        </div>
        <div className="nav-actions">
          <button type="button" className="btn text">
            EN ▾
          </button>
          {user ? (
            <>
              <Link className="btn" to="/app">
                控制台
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
                登录
              </Link>
              <button type="button" className="btn primary" onClick={handleStartTrial}>
                免费试用
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
