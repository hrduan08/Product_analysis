import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchTaskHistory, type TaskRun } from '../services/taskHistory';
import { formatMonthLabel, formatRunTime, monthKeyFromDate } from '../utils/date';
import { formatPlatformList } from '../utils/platform';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const USER_STATUS_LABEL: Record<string, string> = {
  trialing: '试用中',
  active: '已订阅',
  past_due: '待续费',
  canceled: '已取消'
};

type GroupedRuns = {
  key: string;
  label: string;
  runs: TaskRun[];
};

export function TaskHistoryPage(): JSX.Element {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  const TEXT = t({
    zh: {
      nav: { language: '语言', zh: '中文', en: 'English', open: '打开账号信息', logout: '退出登录', loggingOut: '退出中...', status: '账户状态：' },
      title: '全部任务执行记录',
      desc: '按月份划分，展示所有定时任务的执行情况。',
      back: '返回概览',
      loading: '加载中...',
      empty: '暂无执行记录。',
      table: { keywords: '关键词', platform: '平台', runAt: '执行时间', new: '新增反馈', status: '状态' }
    },
    en: {
      nav: { language: 'Language', zh: 'Chinese', en: 'English', open: 'Open account', logout: 'Log out', loggingOut: 'Logging out...', status: 'Status: ' },
      title: 'All scheduled task runs',
      desc: 'Grouped by month, showing all scheduled task executions.',
      back: 'Back to overview',
      loading: 'Loading...',
      empty: 'No records yet.',
      table: { keywords: 'Keywords', platform: 'Platform', runAt: 'Run at', new: 'New feedback', status: 'Status' }
    }
  });

  const accountStatusLabel = useMemo(() => {
    if (!user) return null;
    return USER_STATUS_LABEL[user.status] ?? user.status;
  }, [user]);

  const trialInfo = useMemo(() => {
    if (!user || user.status !== 'trialing' || !user.trialEndsAt) return null as null;
    const endsAt = new Date(user.trialEndsAt);
    if (Number.isNaN(endsAt.getTime())) return null as null;
    const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
    return {
      message: diffDays > 0 ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）` : `试用已到期（${endsAt.toLocaleDateString()}）`
    };
  }, [user?.trialEndsAt]);

  useEffect(() => {
    if (!user?.id) {
      setRuns([]);
      return;
    }
    let cancelled = false;
    setRunsLoading(true);
    setRunsError(null);
    void fetchTaskHistory({ userId: user.id, limit: 120 })
      .then((data) => {
        if (!cancelled) {
          setRuns(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRunsError(error instanceof Error ? error.message : '加载执行记录失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRunsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const groupedRuns = useMemo(() => {
    const sorted = [...runs].sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
    const map = new Map<string, TaskRun[]>();
    sorted.forEach((run) => {
      const date = new Date(run.runAt);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = monthKeyFromDate(date);
      const list = map.get(key) ?? [];
      list.push(run);
      map.set(key, list);
    });
    return Array.from(map.entries())
      .map<GroupedRuns>(([key, list]) => ({
        key,
        label: formatMonthLabel(key),
        runs: list
      }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [runs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      navigate('/');
    } finally {
      setLogoutLoading(false);
      setMenuOpen(false);
    }
  };

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-nav">
        <Link className="logo-mark" to="/">
          <img src="/assets/logos/logo.png" alt="VoiceInsight" className="logo-img" />
          <span className="logo-word">
            Voice<span className="logo-word__accent">Insight</span>
          </span>
        </Link>
        <div className="dashboard-nav__actions" ref={avatarRef}>
          <div className="nav-lang">
            <button type="button" className="btn text" onClick={() => setLangOpen((v) => !v)}>
              {TEXT.nav.language}
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
                  {TEXT.nav.zh}
                </button>
                <button
                  type="button"
                  className={`nav-lang__item${lang === 'en' ? ' is-active' : ''}`}
                  onClick={() => {
                    setLang('en');
                    setLangOpen(false);
                  }}
                >
                  {TEXT.nav.en}
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="dashboard-avatar"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={TEXT.nav.open}
          >
            {(user?.email?.[0] ?? 'U').toUpperCase()}
          </button>
          {menuOpen ? (
            <div className="account-popover account-popover--dashboard">
              <div className="account-popover__header">
                <strong>{user?.email ?? TEXT.nav.status}</strong>
              </div>
              {accountStatusLabel ? (
                <p className="account-popover__status">
                  {TEXT.nav.status}
                  {accountStatusLabel}
                </p>
              ) : null}
              {trialInfo ? <p className="account-popover__status">{trialInfo.message}</p> : null}
              <button type="button" className="btn secondary" onClick={() => void handleLogout()} disabled={logoutLoading}>
                {logoutLoading ? TEXT.nav.loggingOut : TEXT.nav.logout}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="dashboard-shell">
        <article className="dashboard-card dashboard-card--wide">
          <div className="dashboard-card__header">
            <div>
              <h3>{TEXT.title}</h3>
              <p>{TEXT.desc}</p>
            </div>
            <Link to="/app">{TEXT.back}</Link>
          </div>

          {runsLoading ? (
            <p style={{ padding: '16px' }}>{TEXT.loading}</p>
          ) : runsError ? (
            <p style={{ padding: '16px' }}>{runsError}</p>
          ) : groupedRuns.length === 0 ? (
            <p style={{ padding: '16px' }}>{TEXT.empty}</p>
          ) : (
            groupedRuns.map((group) => (
              <section key={group.key} className="task-history-section">
                <h4>{formatMonthLabel(group.key, lang as 'zh' | 'en')}</h4>
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>{TEXT.table.keywords}</th>
                      <th>{TEXT.table.platform}</th>
                      <th>{TEXT.table.runAt}</th>
                      <th>{TEXT.table.new}</th>
                      <th>{TEXT.table.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.runs.map((run) => {
                      const statusClass = run.status === 'success' ? 'ok' : 'warning';
                      const statusLabel =
                        run.status === 'success'
                          ? (lang === 'zh' ? '完成' : 'Success')
                          : run.status === 'partial'
                          ? (lang === 'zh' ? '部分成功' : 'Partial')
                          : (lang === 'zh' ? '失败' : 'Failed');
                      return (
                        <tr key={run.id}>
                          <td>{run.keywords.join(lang === 'zh' ? '、' : ', ')}</td>
                          <td>{formatPlatformList(run.platforms)}</td>
                          <td>{formatRunTime(run.runAt, lang as 'zh' | 'en')}</td>
                          <td>{lang === 'zh' ? `${run.newItems} 条` : `${run.newItems}`}</td>
                          <td>
                            <span className={`task-status task-status--${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ))
          )}
        </article>
      </main>
    </div>
  );
}
