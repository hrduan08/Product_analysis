import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Toast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchSearchConfig,
  patchSearchConfig,
  testFeishuWebhook,
  type SearchConfig,
  type SearchConfigMeta,
  type SearchConfigPatchPayload
} from '../../services/searchConfig';

const PLATFORM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'reddit', label: 'Reddit' }
];

const PLATFORM_ORDER = PLATFORM_OPTIONS.map((item) => item.value);

function sortPlatforms(values: string[]): string[] {
  return PLATFORM_ORDER.filter((value) => values.includes(value));
}

type TimeInputElement = HTMLInputElement & { showPicker?: () => void };

const CHANNEL_ORDER = ['feishu', 'email'] as const;
const CHANNEL_LABEL: Record<typeof CHANNEL_ORDER[number], string> = {
  feishu: '飞书',
  email: '邮件'
};

function sortChannels(values: string[]): string[] {
  const set = new Set(values);
  return CHANNEL_ORDER.filter((channel) => set.has(channel));
}

type ToastState = { message: string; type?: 'success' | 'error' };

const USER_STATUS_LABEL: Record<string, string> = {
  trialing: '试用中',
  active: '已订阅',
  past_due: '待续费',
  canceled: '已取消'
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SUPER_ADMINS = ['474226642@qq.com'];
const ADMIN_TOKEN_KEY = 'pi-admin-token';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_TOKEN ?? '';

export function SearchConfigPage(): JSX.Element {
  const { user, setSession, logout } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<SearchConfig | null>(null);
  const [meta, setMeta] = useState<SearchConfigMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [feishuDraft, setFeishuDraft] = useState('');
  const [testingFeishu, setTestingFeishu] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [avatarTapCount, setAvatarTapCount] = useState(0);
  const tapTimerRef = useRef<number | null>(null);
  const adminUnlockedRef = useRef(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchSearchConfig(user.id);
        if (cancelled) return;
        setConfig(response.config);
        setMeta(response.meta);
        setEmailDraft(response.config.notifyEmail);
        setFeishuDraft(response.config.feishuWebhook ?? '');
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : '加载配置失败，请稍后重试';
          if (/重新登录/.test(message) || /未登录/.test(message) || /401/.test(message)) {
            showToast('会话已失效，请重新登录', 'error');
            setSession(null);
            setConfig(null);
            setMeta(null);
            setEmailDraft('');
            setFeishuDraft('');
            return;
          }
          showToast(message, 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const maxKeywords = meta?.maxKeywords ?? 3;
  const maxSlots = meta?.maxSlots ?? 3;

  const nextRunDisplay = useMemo(() => {
    if (!config?.nextRunAt) {
      return '尚未排程';
    }
    try {
      const date = new Date(config.nextRunAt);
      return date.toLocaleString();
    } catch {
      return config.nextRunAt;
    }
  }, [config?.nextRunAt]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const accountStatusLabel = useMemo(() => {
    if (!user) return null;
    return USER_STATUS_LABEL[user.status] ?? user.status;
  }, [user]);

  const trialInfo = useMemo(() => {
    if (!user || user.status !== 'trialing' || !user.trialEndsAt) return null as null;
    const endsAt = new Date(user.trialEndsAt);
    if (Number.isNaN(endsAt.getTime())) return null as null;
    const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
    const message =
      diffDays > 0
        ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）`
        : `试用已到期（${endsAt.toLocaleDateString()}）`;
    return { message };
  }, [user?.trialEndsAt]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  const applyPatch = async (
    payload: Partial<SearchConfig>,
    requestPayload: Omit<SearchConfigPatchInput, 'userId'>
  ) => {
    if (!config) {
      return;
    }
    const previous = config;
    const optimistic = { ...previous, ...payload };
    setConfig(optimistic);
    setSaving(true);
    try {
      const updated = await patchSearchConfig({ userId: user.id, ...requestPayload });
      setConfig(updated);
      setEmailDraft(updated.notifyEmail);
      if ('feishuWebhook' in requestPayload) {
        setFeishuDraft(updated.feishuWebhook ?? '');
      }
      showToast('配置已保存');
    } catch (error) {
      setConfig(previous);
      setEmailDraft(previous.notifyEmail);
      setFeishuDraft(previous.feishuWebhook ?? '');
      showToast(error instanceof Error ? error.message : '更新配置失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  type SearchConfigPatchInput = SearchConfigPatchPayload;

  const handlePlatformToggle = async (platform: string) => {
    if (!config) return;
    const current = new Set(config.platforms);
    if (current.has(platform)) {
      current.delete(platform);
      if (current.size === 0) {
        showToast('至少选择一个平台', 'error');
        return;
      }
    } else {
      current.add(platform);
    }
    const next = sortPlatforms(Array.from(current));
    await applyPatch({ platforms: next }, { platforms: next });
  };

  const handleAddKeyword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;
    const value = keywordInput.trim();
    if (!value) {
      showToast('请输入要添加的关键词', 'error');
      return;
    }
    if (config.keywords.length >= maxKeywords) {
      showToast(`最多只能添加 ${maxKeywords} 个关键词`, 'error');
      return;
    }
    const exists = config.keywords.some((item) => item.toLowerCase() === value.toLowerCase());
    if (exists) {
      showToast('关键词已存在', 'error');
      return;
    }
    const next = [...config.keywords, value];
    setKeywordInput('');
    await applyPatch({ keywords: next }, { keywords: next });
  };

  const handleRemoveKeyword = async (keyword: string) => {
    if (!config) return;
    const next = config.keywords.filter((item) => item !== keyword);
    await applyPatch({ keywords: next }, { keywords: next });
  };

  const handleAddSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;
    const value = timeInput.trim();
    if (!value) {
      showToast('请选择时间', 'error');
      return;
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
      showToast('时间格式必须为 HH:mm', 'error');
      return;
    }
    if (config.slots.length >= maxSlots) {
      showToast(`每天最多设置 ${maxSlots} 个时间`, 'error');
      return;
    }
    if (config.slots.includes(value)) {
      showToast('该时间已存在', 'error');
      return;
    }
    const next = sortSlots([...config.slots, value]);
    setTimeInput('');
    await applyPatch({ slots: next }, { slots: next });
  };

  const handleRemoveSlot = async (slot: string) => {
    if (!config) return;
    const next = config.slots.filter((item) => item !== slot);
    await applyPatch({ slots: next }, { slots: next });
  };

  const handleChannelToggle = async (channel: 'email' | 'feishu') => {
    if (!config) return;
    const current = new Set(config.notifyChannels);
    if (current.has(channel)) {
      if (current.size === 1) {
        showToast('至少保留一个通知方式', 'error');
        return;
      }
      current.delete(channel);
    } else {
      current.add(channel);
    }
    const next = sortChannels(Array.from(current));
    await applyPatch({ notifyChannels: next }, { notifyChannels: next });
  };

  const handleFeishuSubmit = async () => {
    if (!config) return;
    if (!feishuWebhookDirty) return;
    const value = feishuDraft.trim();
    await applyPatch({ feishuWebhook: value }, { feishuWebhook: value });
  };

  const handleFeishuTest = async () => {
    if (!config || !user) return;
    if (!config.feishuWebhook) {
      showToast('请先填写并保存 Webhook', 'error');
      return;
    }
    setTestingFeishu(true);
    try {
      const result = await testFeishuWebhook({ userId: user.id });
      setConfig((previous) =>
        previous
          ? {
              ...previous,
              feishuStatus: result.status,
              feishuLastTestedAt: result.testedAt
            }
          : previous
      );
      showToast('飞书测试通知已发送', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '飞书测试通知发送失败，请稍后重试';
      showToast(message, 'error');
      setConfig((previous) =>
        previous
          ? {
              ...previous,
              feishuStatus: 'failed',
              feishuLastTestedAt: new Date().toISOString()
            }
          : previous
      );
    } finally {
      setTestingFeishu(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!config) return;
    const value = emailDraft.trim();
    if (!value) {
      showToast('邮箱不能为空', 'error');
      setEmailDraft(config.notifyEmail);
      return;
    }
    if (value === config.notifyEmail) {
      return;
    }
    await applyPatch({ notifyEmail: value }, { notifyEmail: value });
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

  const AccountNav = (
    <header className="dashboard-nav">
      <Link className="logo-mark" to="/">
        <span>PI</span>Product Insight
      </Link>
      <div className="dashboard-nav__actions">
        <button type="button" className="btn text">
          中文 ▾
        </button>
        <div className="nav-avatar-wrapper">
          <button
            type="button"
            className="dashboard-avatar"
            onClick={handleAvatarClick}
            aria-label="打开账号信息"
          >
            {(user.email?.[0] ?? 'U').toUpperCase()}
          </button>
          {menuOpen ? (
            <div className="account-popover account-popover--dashboard">
              <div className="account-popover__header">
                <strong>{user.email}</strong>
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
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="dashboard">
        {AccountNav}
        <div className="dashboard-shell config-page">
          <header className="config-header">
            <div>
              <h1>配置搜索任务</h1>
              <p>加载中，请稍候…</p>
            </div>
          </header>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="dashboard">
        {AccountNav}
        <div className="dashboard-shell config-page">
          <header className="config-header">
            <div>
              <h1>配置搜索任务</h1>
              <p>暂时无法获取配置，请稍后刷新尝试。</p>
            </div>
            <Link to="/app" className="config-link">
              返回控制台
            </Link>
          </header>
        </div>
      </div>
    );
  }

  const feishuEnabled = config.notifyChannels.includes('feishu');
  const emailEnabled = config.notifyChannels.includes('email');
  const feishuStatusLabel =
    config.feishuStatus === 'ok' ? '可用' : config.feishuStatus === 'failed' ? '测试失败' : '待测试';
  const feishuLastTestDisplay = config.feishuLastTestedAt
    ? new Date(config.feishuLastTestedAt).toLocaleString()
    : '尚未测试';
  const feishuWebhookDirty =
    feishuDraft.trim() !== (config?.feishuWebhook ? config.feishuWebhook.trim() : '');

  return (
    <>
    <div className="dashboard">
      {AccountNav}
      <div className="dashboard-shell config-page">
        <header className="config-header">
          <div>
            <h1>配置搜索任务</h1>
            <p>配置你想定时搜索的关键词、定时搜索时间、搜索结果通知方式。</p>
          </div>
          <Link to="/app" className="config-link">
            返回控制台
          </Link>
        </header>

        <section className="config-section">
          <h3>1. 选择搜索平台</h3>
          <p className="config-section__hint">选择定时搜索的平台，至少选择一个平台。</p>
          <div className="platform-toggle">
            {PLATFORM_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`platform-option ${config.platforms.includes(option.value) ? 'active' : ''}`}
                onClick={() => void handlePlatformToggle(option.value)}
                disabled={saving}
              >
                {option.label}
              </button>
            ))}
          </div>
          {(config.platforms.includes('x') || config.platforms.includes('facebook')) && (
            <p className="config-tip">X 与 Facebook 将在后续版本接入，无需重复操作。</p>
          )}
        </section>

        <section className="config-section">
          <div className="config-section__header">
            <h3>2. 监控关键词</h3>
            <span className="config-section__hint">最多 {maxKeywords} 个</span>
          </div>
          <div className="config-chip-list">
            {config.keywords.map((keyword) => (
              <span key={keyword} className="config-chip">
                {keyword}
                <button
                  type="button"
                  className="config-chip__remove"
                  onClick={() => void handleRemoveKeyword(keyword)}
                  disabled={saving}
                  aria-label={`删除关键词 ${keyword}`}
                >
                  ×
                </button>
              </span>
            ))}
            {config.keywords.length === 0 && <span className="config-empty">暂无关键词</span>}
          </div>
          <form className="config-inline-form" onSubmit={(event) => void handleAddKeyword(event)}>
            <input
              type="text"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="例如：Apple Vision Pro"
              disabled={saving}
            />
            <button type="submit" disabled={saving || config.keywords.length >= maxKeywords}>
              添加关键词
            </button>
          </form>
        </section>

        <section className="config-section">
          <div className="config-section__header">
            <h3>3. 每日定时监控时间</h3>
            <span className="config-section__hint">最多 {maxSlots} 个时间点</span>
          </div>
          <div className="config-chip-list">
            {config.slots.map((slot) => (
              <span key={slot} className="config-chip">
                {slot}
                <button
                  type="button"
                  className="config-chip__remove"
                  onClick={() => void handleRemoveSlot(slot)}
                  disabled={saving}
                  aria-label={`删除时间 ${slot}`}
                >
                  ×
                </button>
              </span>
            ))}
            {config.slots.length === 0 && <span className="config-empty">尚未设置执行时间</span>}
          </div>
          <form className="config-inline-form" onSubmit={(event) => void handleAddSlot(event)}>
            <input
              type="time"
              value={timeInput}
              onChange={(event) => setTimeInput(event.target.value)}
              onClick={(event) => {
                const element = event.currentTarget as TimeInputElement;
                element.showPicker?.();
              }}
              onFocus={(event) => {
                const element = event.currentTarget as TimeInputElement;
                element.showPicker?.();
              }}
              disabled={saving}
            />
            <button type="submit" disabled={saving || config.slots.length >= maxSlots}>
              添加时间
            </button>
          </form>
        </section>

        <section className="config-section">
          <h3>4. 通知方式</h3>
          <p className="config-section__hint">默认开启飞书提醒，可与邮件通知同时启用。</p>
          <div className="platform-toggle">
            {CHANNEL_ORDER.map((channel) => (
              <button
                key={channel}
                type="button"
                className={`platform-option ${config.notifyChannels.includes(channel) ? 'active' : ''}`}
                onClick={() => void handleChannelToggle(channel)}
                disabled={saving}
              >
                {CHANNEL_LABEL[channel]}
              </button>
            ))}
          </div>
          {feishuEnabled && (
            <>
              <p className="config-section__hint">
                飞书机器人 Webhook（飞书群聊 &gt; 添加机器人 &gt; 自定义机器人 &gt; 复制 Webhook）
              </p>
              <div className="config-inline-form">
                <input
                  type="url"
                  value={feishuDraft}
                  onChange={(event) => setFeishuDraft(event.target.value)}
                  placeholder="请输入飞书机器人的 Webhook 地址..."
                  disabled={saving}
                />
                <button type="button" onClick={() => void handleFeishuSubmit()} disabled={saving || !feishuWebhookDirty}>
                  保存 Webhook
                </button>
                <button type="button" onClick={() => void handleFeishuTest()} disabled={saving || testingFeishu || !config.feishuWebhook}>
                  {testingFeishu ? '测试中…' : '测试飞书通知'}
                </button>
              </div>
              <p className="config-section__hint">
                状态：{feishuStatusLabel} · {feishuLastTestDisplay}
              </p>
            </>
          )}
          {emailEnabled && (
            <>
              <p className="config-section__hint">邮件通知将发送到以下邮箱，可修改为其他地址。</p>
              <div className="config-inline-form config-inline-form--single">
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  onBlur={() => void handleEmailSubmit()}
                  placeholder="name@example.com"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => void handleEmailSubmit()}
                  disabled={saving || emailDraft.trim() === config.notifyEmail.trim()}
                >
                  保存邮箱
                </button>
              </div>
            </>
          )}
        </section>

        {toast && (
          <div className="toast-container">
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}
      </div>
    </div>
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
    </>
  );
}

function sortSlots(slots: string[]): string[] {
  return slots
    .slice()
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
