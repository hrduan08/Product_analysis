import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { VideoList } from '../components/VideoList';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { formatRunTime } from '../utils/date';
import { fetchSubscription, type Plan } from '../services/billing';
import { fetchTaskHistory, type TaskRun } from '../services/taskHistory';
import { fetchSearchConfig, type SearchConfig } from '../services/searchConfig';
import { formatPlatformList } from '../utils/platform';
import { searchFeedback } from '../services/api';
import type { FeedbackItem, Platform } from '../types/feedback';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_TOKEN ?? '';
const INSTANT_SEARCH_WHITELIST = ['474226642@qq.com', 'dhrstudy2008@126.com'];
const INSTANT_PAGE_SIZE = 20;
const INSTANT_FETCH_LIMIT = 50;

const NOTIFY_LABELS: Record<string, string> = {
  feishu: '飞书',
  email: '邮件'
};

const USER_STATUS_LABEL: Record<string, string> = {
  trialing: '试用中',
  active: '已订阅',
  past_due: '待续费',
  canceled: '已取消'
};

export function SearchPage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarTapCount, setAvatarTapCount] = useState(0);
  const tapTimerRef = useRef<number | null>(null);
  const adminUnlockedRef = useRef(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [instantQuery, setInstantQuery] = useState('');
  const [instantPlatforms, setInstantPlatforms] = useState<Platform[]>(['youtube']);
  const [instantSearched, setInstantSearched] = useState(false);
  const [instantLoading, setInstantLoading] = useState(false);
  const [instantError, setInstantError] = useState<string | null>(null);
  const [instantResults, setInstantResults] = useState<FeedbackItem[]>([]);
  const [instantTotalCount, setInstantTotalCount] = useState<number | null>(null);
  const [instantKeywordsUsed, setInstantKeywordsUsed] = useState<string[]>([]);
  const [instantPlatformsUsed, setInstantPlatformsUsed] = useState<Platform[]>([]);
  const [instantPage, setInstantPage] = useState(1);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [planExpireAt, setPlanExpireAt] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [searchConfigSummary, setSearchConfigSummary] = useState<SearchConfig | null>(null);
  const [searchConfigLoading, setSearchConfigLoading] = useState(false);
  const [searchConfigError, setSearchConfigError] = useState<string | null>(null);
  const [taskRuns, setTaskRuns] = useState<TaskRun[]>([]);
  const [taskRunsLoading, setTaskRunsLoading] = useState(false);
  const [taskRunsError, setTaskRunsError] = useState<string | null>(null);
  const canUseInstantSearch = Boolean(
    user?.email && INSTANT_SEARCH_WHITELIST.includes(user.email.toLowerCase())
  );

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2400);
  };

  const trialInfo = useMemo(() => {
    if (!user || user.status !== 'trialing' || !user.trialEndsAt) {
      return null as null;
    }
    const endsAt = new Date(user.trialEndsAt);
    if (Number.isNaN(endsAt.getTime())) {
      return null as null;
    }
    const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
    const variant = diffDays <= 1 ? ('warning' as const) : ('info' as const);
    return {
      message: diffDays > 0 ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）` : `试用已到期（${endsAt.toLocaleDateString()}）`,
      variant
    };
  }, [user]);

  const accountStatusLabel = useMemo(() => {
    if (!user) return null;
    return USER_STATUS_LABEL[user.status] ?? user.status;
  }, [user]);

  const planCtaLabel = user?.status === 'trialing' || !user ? '立即订阅' : '续费';
  const bannerVariant = trialInfo?.variant ?? 'info';
  const showVerifyWarning = Boolean(user && !user.emailVerified);

  const subscriptionStatusText = useMemo(() => {
    if (!user) return '未登录';
    if (user.status === 'trialing') return '试用中';
    if (user.status === 'past_due') return '会员已到期';
    if (currentPlan?.billing_interval === 'yearly') {
      return '已订阅年度会员';
    }
    if (currentPlan?.billing_interval === 'monthly') {
      return '已订阅月度会员';
    }
    if (user.status === 'active') {
      return '已订阅';
    }
    return USER_STATUS_LABEL[user.status] ?? user.status;
  }, [user, currentPlan?.billing_interval]);

  const expirationDate = user?.status === 'trialing' ? user?.trialEndsAt ?? null : planExpireAt;
  const expirationLabel = expirationDate ? new Date(expirationDate).toLocaleDateString() : '待设置';

  const subscriptionBenefitsText = useMemo(() => {
    const limits = (currentPlan?.limits as { keywords?: number; notifications?: string[] } | undefined) ?? undefined;
    if (limits?.keywords || limits?.notifications) {
      const notificationsCount = limits.notifications ? limits.notifications.length : undefined;
      const parts = [];
      if (limits.keywords) {
        parts.push(`${limits.keywords} 个定时任务`);
      }
      if (notificationsCount) {
        parts.push(`${notificationsCount} 个通知渠道`);
      }
      return `权益：${parts.join(' + ')}`;
    }
    return '权益：订阅后可解锁更多任务与通知渠道';
  }, [currentPlan?.limits]);

  const searchPlatformsText = searchConfigSummary
    ? formatPlatformList(searchConfigSummary.platforms)
    : searchConfigLoading
    ? '加载中...'
    : '尚未配置';

  const searchKeywordsText =
    searchConfigSummary && searchConfigSummary.keywords.length > 0
      ? searchConfigSummary.keywords.slice(0, 3).join('、')
      : '未设置关键词';

  const searchTimesText =
    searchConfigSummary && searchConfigSummary.slots.length > 0
      ? searchConfigSummary.slots.join('、')
      : '未设置时间';

  const searchNotifyText =
    searchConfigSummary && searchConfigSummary.notifyChannels.length > 0
      ? searchConfigSummary.notifyChannels.map((channel) => NOTIFY_LABELS[channel] ?? channel).join(' + ')
      : '未配置通知';

  const searchSummaryButtonLabel = searchConfigSummary ? '修改搜索配置' : '配置搜索任务';
  const searchSummaryLines = searchConfigLoading
    ? ['加载中...']
    : searchConfigError
    ? [searchConfigError]
    : [
        `监控关键词：${searchKeywordsText}`,
        `定时监控时间：${searchTimesText}`,
        `结果通知方式：${searchNotifyText}`
      ];
  const instantResultSummary =
    instantSearched && !instantLoading && instantResults.length > 0
      ? `关键词：${instantKeywordsUsed.join('、')} · 平台：${instantPlatformsUsed
          .map((platform) => (platform === 'youtube' ? 'YouTube' : 'Reddit'))
          .join(' + ')} · 共 ${instantTotalCount ?? instantResults.length} 条`
      : null;
  const showInstantEmptyState = instantSearched && !instantLoading && instantResults.length === 0 && !instantError;
  const instantTotalPages = instantResults.length > 0 ? Math.ceil(instantResults.length / INSTANT_PAGE_SIZE) : 0;
  const pagedInstantResults = useMemo(() => {
    if (instantResults.length === 0) return [];
    const start = (instantPage - 1) * INSTANT_PAGE_SIZE;
    return instantResults.slice(start, start + INSTANT_PAGE_SIZE);
  }, [instantResults, instantPage]);

  useEffect(() => {
    if (instantTotalPages > 0 && instantPage > instantTotalPages) {
      setInstantPage(instantTotalPages);
    }
  }, [instantPage, instantTotalPages]);

  useEffect(() => {
    if (!user?.id) return;
    setPlanLoading(true);
    setPlanError(null);
    void fetchSubscription(user.id)
      .then((data) => {
        setCurrentPlan(data.plan);
        const expireAt = data.subscription?.current_period_end ?? data.user.planExpireAt ?? null;
        setPlanExpireAt(expireAt);
        if (user) {
          updateUser({
            ...user,
            status: (data.user.status ?? user.status) as typeof user.status,
            trialStartedAt: data.user.trialStartedAt ?? null,
            trialEndsAt: data.user.trialEndsAt ?? null,
            planExpireAt: expireAt,
            planId: data.plan?.id ?? data.subscription?.plan_id ?? null
          });
        }
      })
      .catch((error) => {
        setPlanError(error instanceof Error ? error.message : '加载订阅信息失败');
      })
      .finally(() => setPlanLoading(false));
  }, [updateUser, user]);

  useEffect(() => {
    if (!user?.id) {
      setSearchConfigSummary(null);
      return;
    }
    let cancelled = false;
    setSearchConfigLoading(true);
    setSearchConfigError(null);
    void fetchSearchConfig(user.id)
      .then((response) => {
        if (!cancelled) {
          setSearchConfigSummary(response.config);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSearchConfigError(error instanceof Error ? error.message : '加载搜索配置失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearchConfigLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setTaskRuns([]);
      return;
    }
    let cancelled = false;
    setTaskRunsLoading(true);
    setTaskRunsError(null);
    void fetchTaskHistory({ userId: user.id, limit: 12 })
      .then((runs) => {
        if (!cancelled) {
          setTaskRuns(runs);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : '加载任务记录失败';
          setTaskRunsError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTaskRunsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleSecretTap = () => {
    if (!user || !SUPER_ADMINS.includes((user.email ?? '').toLowerCase())) {
      return;
    }
    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current);
    }
    setAvatarTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        if (tapTimerRef.current) {
          window.clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
        }
        setAvatarTapCount(0);
        if (!adminUnlockedRef.current) {
          setAdminPasswordInput('');
          setAdminPasswordError(null);
          setAdminModalOpen(true);
        } else {
          navigate('/admin/manual-orders');
        }
        return 0;
      }
      tapTimerRef.current = window.setTimeout(() => {
        setAvatarTapCount(0);
        tapTimerRef.current = null;
      }, 3000);
      return next;
    });
  };

  const handleAvatarClick = () => {
    handleSecretTap();
    setMenuOpen((prev) => !prev);
  };

  const handleAdminPasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ADMIN_PASSWORD) {
      setAdminPasswordError('尚未配置管理员密码');
      return;
    }
    if (adminPasswordInput.trim() !== ADMIN_PASSWORD) {
      setAdminPasswordError('密码不正确');
      return;
    }
    window.localStorage.setItem(ADMIN_TOKEN_KEY, ADMIN_PASSWORD);
    adminUnlockedRef.current = true;
    setAdminModalOpen(false);
    navigate('/admin/manual-orders');
  };

  const handleInstantPlatformToggle = (platform: Platform) => {
    setInstantPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((value) => value !== platform);
      }
      return [...prev, platform];
    });
  };

  const handleInstantSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = instantQuery.trim();
    setInstantSearched(false);
    if (!trimmed) {
      setInstantError('请输入要搜索的关键词');
      setInstantResults([]);
      setInstantTotalCount(null);
      setInstantKeywordsUsed([]);
      return;
    }
    if (instantPlatforms.length === 0) {
      setInstantError('请至少选择一个平台');
      setInstantResults([]);
      setInstantTotalCount(null);
      setInstantKeywordsUsed([]);
      return;
    }
    const keywords = Array.from(
      new Set(
        trimmed
          .split(/[\n,，、|]+/)
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
    if (keywords.length === 0) {
      setInstantError('请输入有效的关键词');
      setInstantResults([]);
      setInstantTotalCount(null);
      setInstantKeywordsUsed([]);
      return;
    }
    setInstantLoading(true);
    setInstantError(null);
    try {
      const responses = await Promise.all(
        instantPlatforms.flatMap((platform) =>
          keywords.map(async (keyword) => {
            const data = await searchFeedback({
              platform,
              query: keyword,
              limit: INSTANT_FETCH_LIMIT
            });
            return data;
          })
        )
      );
      const merged = responses.flatMap((response) => response.items ?? []);
      merged.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime());
      setInstantResults(merged);
      const total = responses.reduce((sum, response) => {
        const count = response.pageInfo.totalResults ?? response.items.length ?? 0;
        return sum + count;
      }, 0);
      setInstantTotalCount(total);
      setInstantKeywordsUsed(keywords);
      setInstantPlatformsUsed(instantPlatforms);
      setInstantPage(1);
      setInstantSearched(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : '搜索失败，请稍后重试';
      setInstantError(message);
      setInstantResults([]);
      setInstantTotalCount(null);
      setInstantKeywordsUsed([]);
    } finally {
      setInstantLoading(false);
    }
  };

  const handleInstantCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('链接已复制');
    } catch {
      showToast('复制失败，请手动复制', 'error');
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      showToast('已退出登录');
    } catch {
      showToast('退出失败，请稍后再试', 'error');
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
            onClick={handleAvatarClick}
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
              <button type="button" className="btn secondary" onClick={handleLogout} disabled={logoutLoading}>
                {logoutLoading ? '退出中...' : '退出登录'}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="dashboard-shell">
        <section className={`account-banner account-banner--${bannerVariant}`}>
          <div className="account-banner__header">
            <div className="account-banner__identity">
              <div>
                <h2>欢迎回来，{user?.profile?.nickname ?? '成员'}</h2>
              </div>
            </div>
            {showVerifyWarning ? (
              <div className="account-banner__warning">
                邮箱尚未验证，<Link to="/verify-email">前往验证</Link> 后方可创建订阅。
              </div>
            ) : null}
          </div>
          <div className="account-banner__summary">
            <div className="account-banner__summary-item account-banner__summary-item--subscription">
              <span className="account-banner__summary-label">订阅状态</span>
              <strong className="account-banner__summary-value">{subscriptionStatusText}</strong>
              <p className="account-banner__summary-meta">{subscriptionBenefitsText}</p>
              <div className="account-banner__meta-line">
                <span>{user?.status === 'trialing' ? '试用到期：' : '到期日：'}{expirationLabel}</span>
                <Link to="/app/subscription" className="account-banner__summary-button">
                  {planCtaLabel}
                </Link>
              </div>
              {planError ? <p className="account-banner__summary-meta">{planError}</p> : null}
            </div>
            <div className="account-banner__summary-item">
              <span className="account-banner__summary-label">搜索配置摘要</span>
              <strong className="account-banner__summary-value">{searchPlatformsText}</strong>
              <div className="account-banner__summary-meta account-banner__summary-meta--stack">
                {searchSummaryLines.map((line, index) => (
                  <span key={index}>{line}</span>
                ))}
              </div>
              <Link to="/app/search-config" className="account-banner__summary-link">
                {searchSummaryButtonLabel}
              </Link>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          {canUseInstantSearch ? (
            <article className="dashboard-card dashboard-card--wide">
              <div className="dashboard-card__header">
                <h3>即时搜索</h3>
                {instantResultSummary ? (
                  <span className="account-banner__summary-meta">{instantResultSummary}</span>
                ) : null}
              </div>
              <form className="instant-search-form" onSubmit={handleInstantSearch}>
                <div className="instant-search-row">
                  <div className="instant-search-form__group instant-search-form__group--platforms">
                    <span className="instant-search-form__label">平台</span>
                    <div className="instant-search-platforms">
                      {(['youtube', 'reddit'] as Platform[]).map((platform) => (
                        <label key={platform} className="instant-search-platforms__option">
                          <input
                            type="checkbox"
                            checked={instantPlatforms.includes(platform)}
                            onChange={() => handleInstantPlatformToggle(platform)}
                          />
                          {platform === 'youtube' ? 'YouTube' : 'Reddit'}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="instant-search-row instant-search-row--keywords">
                  <div className="instant-search-form__group instant-search-form__group--grow">
                    <span className="instant-search-form__label">搜索关键词</span>
                    <input
                      type="text"
                      value={instantQuery}
                      onChange={(event) => setInstantQuery(event.target.value)}
                      placeholder="例如：Helio Strap 最新评价"
                    />
                  </div>
                  <div className="instant-search-form__actions">
                    <button type="submit" className="btn primary" disabled={instantLoading}>
                      {instantLoading ? '搜索中...' : '立即搜索'}
                    </button>
                  </div>
                </div>
              </form>
              {instantError ? <div className="subscription-error">{instantError}</div> : null}
              {showInstantEmptyState ? (
                <p className="task-table__empty">暂未检索到相关内容，换个关键词或平台试试。</p>
              ) : null}
              <VideoList items={pagedInstantResults} onCopyLink={handleInstantCopyLink} />
              {instantTotalPages > 1 ? (
                <div className="instant-search-pagination">
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={instantPage <= 1}
                    onClick={() => setInstantPage((page) => Math.max(1, page - 1))}
                  >
                    上一页
                  </button>
                  <span className="instant-search-pagination__info">
                    第 {instantPage} / {instantTotalPages} 页
                  </span>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={instantPage >= instantTotalPages}
                    onClick={() => setInstantPage((page) => Math.min(instantTotalPages, page + 1))}
                  >
                    下一页
                  </button>
                </div>
              ) : null}
            </article>
          ) : null}
          <article className="dashboard-card dashboard-card--wide">
            <div className="dashboard-card__header">
              <h3>定时任务执行记录</h3>
              <Link to="/app/task-history">查看全部任务</Link>
            </div>
            <table className="task-table">
              <thead>
                <tr>
                  <th>关键词</th>
                  <th>平台</th>
                  <th>最近运行</th>
                  <th>新增反馈</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {taskRunsLoading ? (
                  <tr>
                    <td colSpan={5} className="task-table__empty">
                      加载中...
                    </td>
                  </tr>
                ) : taskRunsError ? (
                  <tr>
                    <td colSpan={5} className="task-table__empty">
                      {taskRunsError}
                    </td>
                  </tr>
                ) : taskRuns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="task-table__empty">
                      暂无执行记录
                    </td>
                  </tr>
                ) : (
                  taskRuns.map((run) => {
                    const statusClass = run.status === 'success' ? 'ok' : 'warning';
                    const statusLabel =
                      run.status === 'success' ? '完成' : run.status === 'partial' ? '部分成功' : '失败';
                    return (
                      <tr key={run.id}>
                        <td>{run.keywords.length ? run.keywords.join('、') : '未设置'}</td>
                        <td>{formatPlatformList(run.platforms)}</td>
                        <td>{formatRunTime(run.runAt)}</td>
                        <td>{run.newItems} 条</td>
                        <td>
                          <span className={`task-status task-status--${statusClass}`}>{statusLabel}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </article>
        </div>

        {toast ? <Toast message={toast.message} type={toast.type} /> : null}
      </main>
      {adminModalOpen ? (
        <div className="admin-password-modal">
          <form className="admin-password-card" onSubmit={handleAdminPasswordSubmit}>
            <h3>输入管理员密码</h3>
            <p className="plan-meta">完成验证后将进入管理平台。</p>
            <input
              type="password"
              value={adminPasswordInput}
              onChange={(event) => setAdminPasswordInput(event.target.value)}
              placeholder="管理员密码"
              autoFocus
            />
            {adminPasswordError ? <div className="subscription-error">{adminPasswordError}</div> : null}
            <div className="admin-password-card__actions">
              <button type="button" className="btn secondary" onClick={() => setAdminModalOpen(false)}>
                取消
              </button>
              <button type="submit" className="btn primary">
                确定
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
