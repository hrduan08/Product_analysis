import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

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
import { useLanguage } from '../contexts/LanguageContext';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_TOKEN ?? '';
const INSTANT_SEARCH_WHITELIST = ['474226642@qq.com', 'dhrstudy2008@126.com'];
const INSTANT_PAGE_SIZE = 20;
const INSTANT_FETCH_LIMIT = 50;

export function SearchPage() {
  const { user, logout, updateUser } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarTapCount, setAvatarTapCount] = useState(0);
  const tapTimerRef = useRef<number | null>(null);
  const adminUnlockedRef = useRef(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);
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
  const [langOpen, setLangOpen] = useState(false);
  const canUseInstantSearch = Boolean(
    user?.email && INSTANT_SEARCH_WHITELIST.includes(user.email.toLowerCase())
  );

  const TEXT = t({
    zh: {
      notifyLabels: { feishu: '飞书', email: '邮件' },
      userStatus: { trialing: '试用中', active: '已订阅', past_due: '待续费', canceled: '已取消' },
      nav: { language: '语言', zh: '中文', en: 'English', dashboard: '控制台' },
      logout: { title: '退出登录', loggingOut: '退出中...', success: '已退出登录', fail: '退出失败，请稍后再试' },
      banner: {
        welcome: '欢迎回来，',
        verify: '邮箱尚未验证，',
        verifyLink: '前往验证',
        verifySuffix: ' 后方可创建订阅。',
        subscription: '订阅状态',
        benefits: '权益：订阅后可解锁更多任务与通知渠道',
        benefitsPrefix: '权益：',
        benefitsTasks: (n: number) => `${n} 个定时任务`,
        benefitsNotify: (n: number) => `${n} 个通知渠道`,
        defaultExpired: '待设置',
        daily: '每日定时搜索和分析',
        keywords: '关键词：',
        slots: '定时搜索时间：',
        notify: '消息通知方式：',
        summaryBtnConfigured: '修改搜索配置',
        summaryBtnEmpty: '配置搜索任务',
        trialRemaining: (d: number, date: string) => `试用剩余 ${d} 天（${date} 到期）`,
        trialExpired: (date: string) => `试用已到期（${date}）`,
        expireLabelTrial: '试用到期：',
        expireLabelNormal: '到期日：',
        statusPending: '未登录',
        statusPastDue: '会员已到期',
        statusYearly: '已订阅年度会员',
        statusMonthly: '已订阅月度会员'
      },
      instant: {
        title: '即时搜索',
        platformLabel: '平台',
        keywordLabel: '搜索关键词',
        placeholder: '例如：Helio Strap 最新评价',
        searchBtn: '立即搜索',
        searching: '搜索中...',
        empty: '暂未检索到相关内容，换个关键词或平台试试。',
        copied: '链接已复制',
        copyFail: '复制失败，请手动复制',
        fail: '搜索失败，请稍后重试',
        summary: (kw: string, pf: string, total: number) => `关键词：${kw} · 平台：${pf} · 共 ${total} 条`,
        prev: '上一页',
        next: '下一页',
        pageInfo: (p: number, total: number) => `第 ${p} / ${total} 页`,
        historyTitle: '搜索记录',
        historyAll: '查看全部任务',
        table: { keywords: '关键词', platform: '平台', latest: '最近运行', new: '新增反馈', status: '状态', loading: '加载中...', empty: '暂无执行记录' }
      },
      toast: { loadPlanFail: '加载订阅信息失败' },
      accountPopover: { title: '打开账号信息', status: '账户状态：', logout: '退出登录' }
    },
    en: {
      notifyLabels: { feishu: 'Feishu', email: 'Email' },
      userStatus: { trialing: 'Trial', active: 'Active', past_due: 'Past due', canceled: 'Canceled' },
      nav: { language: 'Language', zh: 'Chinese', en: 'English', dashboard: 'Dashboard' },
      logout: { title: 'Log out', loggingOut: 'Logging out...', success: 'Logged out', fail: 'Failed to log out, please try again' },
      banner: {
        welcome: 'Welcome back, ',
        verify: 'Email not verified, ',
        verifyLink: 'verify now',
        verifySuffix: ' before creating a subscription.',
        subscription: 'Subscription status',
        benefits: 'Benefits: unlock more tasks and channels after subscribing',
        benefitsPrefix: 'Benefits: ',
        benefitsTasks: (n: number) => `${n} scheduled tasks`,
        benefitsNotify: (n: number) => `${n} notification channels`,
        defaultExpired: 'Not set',
        daily: 'Daily scheduled search & analysis',
        keywords: 'Keywords: ',
        slots: 'Search time: ',
        notify: 'Notify via: ',
        summaryBtnConfigured: 'Edit search config',
        summaryBtnEmpty: 'Set up search task',
        trialRemaining: (d: number, date: string) => `Trial ends in ${d} days (${date})`,
        trialExpired: (date: string) => `Trial expired (${date})`,
        expireLabelTrial: 'Trial ends: ',
        expireLabelNormal: 'Expires on: ',
        statusPending: 'Not logged in',
        statusPastDue: 'Membership expired',
        statusYearly: 'Subscribed yearly',
        statusMonthly: 'Subscribed monthly'
      },
      instant: {
        title: 'Instant search',
        platformLabel: 'Platform',
        keywordLabel: 'Search keywords',
        placeholder: 'e.g. Helio Strap latest reviews',
        searchBtn: 'Search now',
        searching: 'Searching...',
        empty: 'No results found. Try other keywords or platforms.',
        copied: 'Link copied',
        copyFail: 'Copy failed, please copy manually',
        fail: 'Search failed, please try again later',
        summary: (kw: string, pf: string, total: number) => `Keywords: ${kw} · Platforms: ${pf} · Total ${total}`,
        prev: 'Prev',
        next: 'Next',
        pageInfo: (p: number, total: number) => `Page ${p} / ${total}`,
        historyTitle: 'Search history',
        historyAll: 'View all tasks',
        table: { keywords: 'Keywords', platform: 'Platform', latest: 'Last run', new: 'New feedback', status: 'Status', loading: 'Loading...', empty: 'No records yet' }
      },
      toast: { loadPlanFail: 'Failed to load subscription info' },
      accountPopover: { title: 'Open account', status: 'Status: ', logout: 'Log out' }
    }
  });

  const NOTIFY_LABELS: Record<string, string> = TEXT.notifyLabels as Record<string, string>;
  const USER_STATUS_LABEL = TEXT.userStatus;

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

  const planCtaLabel =
    user?.status === 'trialing' || !user ? (lang === 'zh' ? '立即订阅' : 'Subscribe now') : (lang === 'zh' ? '续费' : 'Renew');
  const bannerVariant = trialInfo?.variant ?? 'info';
  const showVerifyWarning = Boolean(user && !user.emailVerified);

  const subscriptionStatusText = useMemo(() => {
    if (!user) return TEXT.banner.statusPending;
    if (user.status === 'trialing') return USER_STATUS_LABEL.trialing;
    if (user.status === 'past_due') return TEXT.banner.statusPastDue ?? USER_STATUS_LABEL.past_due;
    if (currentPlan?.billing_interval === 'yearly') {
      return TEXT.banner.statusYearly ?? USER_STATUS_LABEL.active;
    }
    if (currentPlan?.billing_interval === 'monthly') {
      return TEXT.banner.statusMonthly ?? USER_STATUS_LABEL.active;
    }
    if (user.status === 'active') return USER_STATUS_LABEL.active;
    return USER_STATUS_LABEL[user.status] ?? user.status;
  }, [TEXT.banner, USER_STATUS_LABEL, currentPlan?.billing_interval, user]);

  const expirationDate = user?.status === 'trialing' ? user?.trialEndsAt ?? null : planExpireAt;
  const expirationLabel = expirationDate ? new Date(expirationDate).toLocaleDateString() : TEXT.banner.defaultExpired;

  const subscriptionBenefitsText = useMemo(() => {
    const limits = (currentPlan?.limits as { keywords?: number; notifications?: string[] } | undefined) ?? undefined;
    if (limits?.keywords || limits?.notifications) {
      const notificationsCount = limits.notifications ? limits.notifications.length : undefined;
      const parts: string[] = [];
      if (limits.keywords) {
        parts.push(lang === 'zh' ? `${limits.keywords} 个定时任务` : TEXT.banner.benefitsTasks(limits.keywords));
      }
      if (notificationsCount) {
        parts.push(lang === 'zh' ? `${notificationsCount} 个通知渠道` : TEXT.banner.benefitsNotify(notificationsCount));
      }
      const prefix = lang === 'zh' ? '权益：' : TEXT.banner.benefitsPrefix;
      return `${prefix}${parts.join(' + ')}`;
    }
    return lang === 'zh' ? '权益：订阅后可解锁更多任务与通知渠道' : TEXT.banner.benefits;
  }, [TEXT.banner, currentPlan?.limits, lang]);

  const searchPlatformsText = searchConfigSummary
    ? formatPlatformList(searchConfigSummary.platforms)
    : searchConfigLoading
    ? TEXT.instant.table.loading
    : lang === 'zh' ? '尚未配置' : 'Not set yet';

  const searchKeywordsText =
    searchConfigSummary && searchConfigSummary.keywords.length > 0
      ? searchConfigSummary.keywords.slice(0, 3).join(lang === 'zh' ? '、' : ', ')
      : lang === 'zh' ? '未设置关键词' : 'Not set';

  const searchTimesText =
    searchConfigSummary && searchConfigSummary.slots.length > 0
      ? searchConfigSummary.slots.join(lang === 'zh' ? '、' : ', ')
      : lang === 'zh' ? '未设置时间' : 'Not set';

  const searchNotifyText =
    searchConfigSummary && searchConfigSummary.notifyChannels.length > 0
      ? searchConfigSummary.notifyChannels.map((channel) => NOTIFY_LABELS[channel] ?? channel).join(' + ')
      : lang === 'zh' ? '未配置通知' : 'Not set';

  const searchSummaryButtonLabel = searchConfigSummary ? TEXT.banner.summaryBtnConfigured : TEXT.banner.summaryBtnEmpty;
  const searchSummaryLines = searchConfigLoading
    ? [TEXT.instant.table.loading]
    : searchConfigError
    ? [searchConfigError]
    : [
        `${TEXT.banner.keywords}${searchKeywordsText}`,
        `${TEXT.banner.slots}${searchTimesText}`,
        `${TEXT.banner.notify}${searchNotifyText}`
      ];
  const instantResultSummary =
    instantSearched && !instantLoading && instantResults.length > 0
      ? TEXT.instant.summary(
          instantKeywordsUsed.join(lang === 'zh' ? '、' : ', '),
          instantPlatformsUsed.map((platform) => (platform === 'youtube' ? 'YouTube' : 'Reddit')).join(' + '),
          instantTotalCount ?? instantResults.length
        )
      : null;
  const showInstantEmptyState = instantSearched && !instantLoading && instantResults.length === 0 && !instantError;
  const instantTotalPages = instantResults.length > 0 ? Math.ceil(instantResults.length / INSTANT_PAGE_SIZE) : 0;
  const pagedInstantResults = useMemo(() => {
    if (instantResults.length === 0) return [];
    const start = (instantPage - 1) * INSTANT_PAGE_SIZE;
    return instantResults.slice(start, start + INSTANT_PAGE_SIZE);
  }, [instantResults, instantPage]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

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
        setPlanError(error instanceof Error ? error.message : TEXT.toast.loadPlanFail);
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
          const message = error instanceof Error ? error.message : (lang === 'zh' ? '加载任务记录失败' : 'Failed to load records');
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const handleLangClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleLangClickOutside);
    return () => document.removeEventListener('mousedown', handleLangClickOutside);
  }, [langOpen]);

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
      setInstantError(lang === 'zh' ? '请输入要搜索的关键词' : 'Please enter keywords to search');
      setInstantResults([]);
      setInstantTotalCount(null);
      setInstantKeywordsUsed([]);
      return;
    }
    if (instantPlatforms.length === 0) {
      setInstantError(lang === 'zh' ? '请至少选择一个平台' : 'Select at least one platform');
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
      setInstantError(lang === 'zh' ? '请输入有效的关键词' : 'Please enter valid keywords');
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
      const message = error instanceof Error ? error.message : TEXT.instant.fail;
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
      showToast(TEXT.instant.copied);
    } catch {
      showToast(TEXT.instant.copyFail, 'error');
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      showToast(TEXT.logout.success);
      navigate('/');
    } catch {
      showToast(TEXT.logout.fail, 'error');
    } finally {
      setLogoutLoading(false);
      setMenuOpen(false);
      setLangOpen(false);
    }
  };

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
          <div className="nav-lang" ref={langRef}>
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
            onClick={handleAvatarClick}
            aria-label={TEXT.accountPopover.title}
          >
            {(user?.email?.[0] ?? 'U').toUpperCase()}
          </button>
          {menuOpen ? (
            <div className="account-popover account-popover--dashboard">
              <div className="account-popover__header">
                <strong>{user?.email ?? TEXT.banner.statusPending}</strong>
              </div>
              {accountStatusLabel ? (
                <p className="account-popover__status">
                  {TEXT.accountPopover.status}
                  {accountStatusLabel}
                </p>
              ) : null}
              {trialInfo ? <p className="account-popover__status">{trialInfo.message}</p> : null}
              <button type="button" className="btn secondary" onClick={handleLogout} disabled={logoutLoading}>
                {logoutLoading ? TEXT.logout.loggingOut : TEXT.logout.title}
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
                <h2>
                  {TEXT.banner.welcome}
                  {user?.profile?.nickname ?? (lang === 'zh' ? '成员' : 'Member')}
                </h2>
              </div>
            </div>
            {showVerifyWarning ? (
              <div className="account-banner__warning">
                {TEXT.banner.verify}
                <Link to="/verify-email">{TEXT.banner.verifyLink}</Link>
                {TEXT.banner.verifySuffix}
              </div>
            ) : null}
          </div>
          <div className="account-banner__summary">
            <div className="account-banner__summary-item account-banner__summary-item--subscription">
              <span className="account-banner__summary-label">{TEXT.banner.subscription}</span>
              <strong className="account-banner__summary-value">{subscriptionStatusText}</strong>
              <p className="account-banner__summary-meta">{subscriptionBenefitsText}</p>
              <div className="account-banner__meta-line">
                <span>
                  {user?.status === 'trialing' ? TEXT.banner.expireLabelTrial : TEXT.banner.expireLabelNormal}
                  {expirationLabel}
                </span>
                <Link to="/app/subscription" className="account-banner__summary-button">
                  {planCtaLabel}
                </Link>
              </div>
              {planError ? <p className="account-banner__summary-meta">{planError}</p> : null}
            </div>
            <div className="account-banner__summary-item">
              <span className="account-banner__summary-label">{TEXT.banner.daily}</span>
              <strong className="account-banner__summary-value">{searchPlatformsText}</strong>
              <div className="account-banner__summary-meta account-banner__summary-meta--stack">
                <span>
                  {TEXT.banner.keywords}
                  {searchKeywordsText}
                </span>
                <span>
                  {TEXT.banner.slots}
                  {searchTimesText}
                </span>
                <span>
                  {TEXT.banner.notify}
                  {searchNotifyText}
                </span>
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
                <h3>{TEXT.instant.title}</h3>
                {instantResultSummary ? (
                  <span className="account-banner__summary-meta">{instantResultSummary}</span>
                ) : null}
              </div>
              <form className="instant-search-form" onSubmit={handleInstantSearch}>
                <div className="instant-search-row">
                  <div className="instant-search-form__group instant-search-form__group--platforms">
                    <span className="instant-search-form__label">{TEXT.instant.platformLabel}</span>
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
                    <span className="instant-search-form__label">{TEXT.instant.keywordLabel}</span>
                    <input
                      type="text"
                      value={instantQuery}
                      onChange={(event) => setInstantQuery(event.target.value)}
                      placeholder={TEXT.instant.placeholder}
                    />
                  </div>
                  <div className="instant-search-form__actions">
                    <button type="submit" className="btn primary" disabled={instantLoading}>
                      {instantLoading ? TEXT.instant.searching : TEXT.instant.searchBtn}
                    </button>
                  </div>
                </div>
              </form>
              {instantError ? <div className="subscription-error">{instantError}</div> : null}
              {showInstantEmptyState ? (
                <p className="task-table__empty">{TEXT.instant.empty}</p>
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
                    {TEXT.instant.prev}
                  </button>
                  <span className="instant-search-pagination__info">
                    {TEXT.instant.pageInfo(instantPage, instantTotalPages)}
                  </span>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={instantPage >= instantTotalPages}
                    onClick={() => setInstantPage((page) => Math.min(instantTotalPages, page + 1))}
                  >
                    {TEXT.instant.next}
                  </button>
                </div>
              ) : null}
            </article>
          ) : null}
          <article className="dashboard-card dashboard-card--wide">
            <div className="dashboard-card__header">
              <h3>{TEXT.instant.historyTitle}</h3>
              <Link to="/app/task-history">{TEXT.instant.historyAll}</Link>
            </div>
            <table className="task-table">
              <thead>
                <tr>
                  <th>{TEXT.instant.table.keywords}</th>
                  <th>{TEXT.instant.table.platform}</th>
                  <th>{TEXT.instant.table.latest}</th>
                  <th>{TEXT.instant.table.new}</th>
                  <th>{TEXT.instant.table.status}</th>
                </tr>
              </thead>
              <tbody>
                {taskRunsLoading ? (
                  <tr>
                    <td colSpan={5} className="task-table__empty">
                      {TEXT.instant.table.loading}
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
                      {TEXT.instant.table.empty}
                    </td>
                  </tr>
                ) : (
                  taskRuns.map((run) => {
                    const statusClass = run.status === 'success' ? 'ok' : 'warning';
                    const statusLabel =
                      run.status === 'success'
                        ? (lang === 'zh' ? '完成' : 'Success')
                        : run.status === 'partial'
                        ? (lang === 'zh' ? '部分成功' : 'Partial')
                        : (lang === 'zh' ? '失败' : 'Failed');
                    return (
                      <tr key={run.id}>
                        <td>{run.keywords.length ? run.keywords.join(lang === 'zh' ? '、' : ', ') : (lang === 'zh' ? '未设置' : 'Not set')}</td>
                        <td>{formatPlatformList(run.platforms)}</td>
                        <td>{formatRunTime(run.runAt, lang as 'zh' | 'en')}</td>
                        <td>{lang === 'zh' ? `${run.newItems} 条` : `${run.newItems}`}</td>
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
