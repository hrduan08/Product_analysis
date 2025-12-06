import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);

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
    <div className="dashboard">
      <header className="dashboard-nav">
        <Link className="logo-mark" to="/">
          <span>PI</span>Product Insight
        </Link>
        <div className="dashboard-nav__actions">
          <button type="button" className="btn text">
            中文 ▾
          </button>
          <button
            type="button"
            className="dashboard-avatar"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="打开账号信息"
          >
            {(user?.email?.[0] ?? 'U').toUpperCase()}
          </button>
          {menuOpen ? (
            <div className="account-popover account-popover--dashboard">
              <div className="account-popover__header">
                <strong>{user?.email ?? '未登录'}</strong>
              </div>
              {accountStatusLabel ? (
                <p className="account-popover__status">账户状态：{accountStatusLabel}</p>
              ) : null}
              {trialInfo ? <p className="account-popover__status">{trialInfo.message}</p> : null}
              <button type="button" className="btn secondary" onClick={() => void handleLogout()} disabled={logoutLoading}>
                {logoutLoading ? '退出中...' : '退出登录'}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="dashboard-shell">
        <article className="dashboard-card dashboard-card--wide">
          <div className="dashboard-card__header">
            <div>
              <h3>全部任务执行记录</h3>
              <p>按月份划分，展示所有定时任务的执行情况。</p>
            </div>
            <Link to="/app">返回概览</Link>
          </div>

          {runsLoading ? (
            <p style={{ padding: '16px' }}>加载中...</p>
          ) : runsError ? (
            <p style={{ padding: '16px' }}>{runsError}</p>
          ) : groupedRuns.length === 0 ? (
            <p style={{ padding: '16px' }}>暂无执行记录。</p>
          ) : (
            groupedRuns.map((group) => (
              <section key={group.key} className="task-history-section">
                <h4>{group.label}</h4>
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>关键词</th>
                      <th>平台</th>
                      <th>执行时间</th>
                      <th>新增反馈</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.runs.map((run) => (
                      <tr key={run.id}>
                        <td>{run.keywords.join('、')}</td>
                        <td>{formatPlatformList(run.platforms)}</td>
                        <td>{formatRunTime(run.runAt)}</td>
                        <td>{run.newItems} 条</td>
                        <td>
                          <span className={`task-status task-status--${run.status === 'success' ? 'ok' : 'warning'}`}>
                            {run.status === 'success' ? '完成' : run.status === 'partial' ? '部分成功' : '失败'}
                          </span>
                        </td>
                      </tr>
                    ))}
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
