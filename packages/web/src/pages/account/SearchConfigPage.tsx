import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { Toast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
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

const CHANNEL_ORDER = ['feishu', 'email'] as const;

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

function sortChannels(values: string[]): string[] {
  const set = new Set(values);
  return CHANNEL_ORDER.filter((channel) => set.has(channel));
}

export function SearchConfigPage(): JSX.Element {
  const { user, setSession, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  const [config, setConfig] = useState<SearchConfig | null>(null);
  const [meta, setMeta] = useState<SearchConfigMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [redditCommunityInput, setRedditCommunityInput] = useState('');
  const [redditKeywordInput, setRedditKeywordInput] = useState('');
  const [youtubeKeywordInput, setYoutubeKeywordInput] = useState('');
  const [productWebsiteDraft, setProductWebsiteDraft] = useState('');
  const [productCommerceDraft, setProductCommerceDraft] = useState('');
  const [productDescriptionDraft, setProductDescriptionDraft] = useState('');
  const [productBrandDraft, setProductBrandDraft] = useState('');
  const [productNameDraft, setProductNameDraft] = useState('');
  const [productCategoryDraft, setProductCategoryDraft] = useState('');
  const [coreFeatureInput, setCoreFeatureInput] = useState('');
  const [productProfileLocalDirty, setProductProfileLocalDirty] = useState(false);

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
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  const NAV_TEXT = t({
    zh: {
      language: '语言',
      zh: '中文',
      en: 'English',
      logout: '退出登录',
      loggingOut: '退出中...',
      status: '账户状态：',
      open: '打开账号信息'
    },
    en: {
      language: 'Language',
      zh: 'Chinese',
      en: 'English',
      logout: 'Log out',
      loggingOut: 'Logging out...',
      status: 'Status: ',
      open: 'Open account'
    }
  });

  const TEXT = t({
    zh: {
      title: '社媒监控配置',
      subtitle: '系统会按队列自动执行增量提取，不再需要手动设置每天固定时间。',
      loading: '页面加载中...',
      sectionPlatform: '1. 选择社媒平台',
      sectionPlatformDesc: '系统会持续追踪你选择的社媒平台，发现和你设置的产品信息相匹配的热门内容。',
      sectionReddit: '2. Reddit 设置（Beta）',
      sectionYouTube: '3. YouTube 设置',
      sectionProduct: '4. 产品画像',
      sectionNotify: '5. 消息通知',
      disabledHint: '当前未启用该平台',
      betaBadge: 'Beta',
      redditBetaAllowedHint: '',
      redditBetaLockedHint: 'Reddit 仍处于 Beta 阶段，暂未对当前账号开放。',
      redditProviderDisabledHint: 'Reddit 数据源暂未启用。',
      redditCommunities: '关注社区',
      redditCommunitiesDesc: '填写 Reddit 社区 URL（最多 3 个）。',
      redditCommunityPlaceholder: '例如：https://www.reddit.com/r/AppleWatch/',
      redditKeywords: '社区内关键词筛选',
      redditKeywordsDesc:
        '请设置你关注的产品的完整名称，尽量不要缩写。例如AppleWatch、Huawei Watch GT2、Garmin Forerunner 970',
      redditKeywordPlaceholder: '例如：HuaweiWatchGT2',
      youtubeKeywords: '关键词发现',
      youtubeKeywordsDesc: '',
      youtubeKeywordsHint:
        '请设置你关注的产品的完整名称，尽量不要缩写。例如AppleWatch、Huawei Watch GT2、Garmin Forerunner 970',
      youtubeKeywordPlaceholder: '例如：Amazfit Active 3',
      productInfoDesc: '填写官网链接、电商平台链接和产品介绍后，系统会结合当前关键词自动生成产品画像，并自动覆盖你在 YouTube 和 Reddit 中设置的产品关键词。',
      productWebsite: '官网链接',
      productCommerce: '电商平台链接',
      productDescription: '产品介绍',
      productDescriptionPlaceholder: '例如：Amazfit Helio Strap 是一款聚焦恢复、睡眠监测、心率监测和运动洞察的可穿戴设备。',
      productProfileStatus: '画像状态：',
      productProfileBrand: '品牌',
      productProfileName: '产品名',
      productProfileCategory: '类别',
      productProfileTargets: '目标产品范围',
      productProfileCoreFeatures: '核心特征',
      productProfileGeneratedAt: '最近生成时间：',
      emptyTargetProducts: '暂无目标产品',
      addFeature: '添加特征',
      emptyFeatures: '暂无核心特征',
      saveProductSources: '保存并生成画像',
      saveProductProfile: '保存画像修改',
      productStatusIdle: '未生成',
      productStatusPending: '生成中',
      productStatusReady: '生成成功',
      productStatusFailed: '生成失败',
      productStatusManual: '已人工修改',
      toastNeedProductSource: '请至少填写一个产品信息来源',
      toastNeedFeature: '请先填写核心特征',
      toastProductProfileSaved: '产品画像已保存',
      addCommunity: '添加社区',
      addKeyword: '添加关键词',
      notifyDesc: '',
      notifyEmail: '邮件通知',
      notifyEmailPlaceholder: 'name@example.com',
      notifyFeishu: '飞书通知',
      feishuSteps: '飞书机器人Webhook设置步骤：',
      feishuStep1: '第一步：创建飞书群聊',
      feishuStep2: '第二步：在群聊页面右上角点击“...”，选择【设置】进入设置页面',
      feishuStep3: '第三步：在设置页面选择【群机器人】，再依次点击【添加机器人】>【自定义机器人】',
      feishuStep4: '第四步：复制页面上显示的“Webhook地址”，添加到以下输入框并保存',
      feishuNotice: '注意：保存 Webhook地址后，请点击【测试飞书通知】，并在飞书中确认能收到测试消息。',
      feishuPlaceholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
      btnSave: '保存',
      btnTestFeishu: '测试飞书通知',
      toastSaved: '配置已保存',
      toastUpdateFail: '更新配置失败',
      toastLoadFail: '加载配置失败，请稍后重试',
      toastSessionExpired: '会话已失效，请重新登录',
      toastNeedPlatform: '至少选择一个平台',
      toastCommunityNeed: '请先填写社区 URL 或 r/社区名',
      toastCommunityInvalid: '社区格式不正确，请填写社区 URL 或 r/社区名',
      toastCommunityMax: (n: number) => `最多只能添加 ${n} 个社区`,
      toastCommunityExist: '该社区已存在',
      toastKeywordNeed: '请先填写关键词',
      toastRedditKeywordMax: (n: number) => `Reddit 最多只能添加 ${n} 个关键词`,
      toastYoutubeKeywordMax: (n: number) => `YouTube 最多只能添加 ${n} 个关键词`,
      toastKeywordExist: '关键词已存在',
      toastNeedWebhook: '请先填写并保存 Webhook',
      toastFeishuTestOk: '飞书测试通知已发送',
      toastFeishuTestFail: '飞书测试通知发送失败，请稍后重试',
      toastNeedEmail: '邮箱不能为空',
      toastNeedNotifyChannel: '至少保留一个通知方式',
      toastRedditBetaUnavailable: 'Reddit Beta 功能暂未开放，如需试用请联系 VoiceInsight 团队',
      labelFeishuStatus: '飞书状态：',
      emptyCommunities: '暂无社区',
      emptyKeywords: '暂无关键词'
    },
    en: {
      title: 'Social Monitoring Config',
      subtitle: 'We run incremental monitoring with an automatic queue. No fixed daily time is needed.',
      loading: 'Loading...',
      sectionPlatform: '1. Choose platforms',
      sectionPlatformDesc:
        'We continuously track the social platforms you choose and surface popular content that matches your product information.',
      sectionReddit: '2. Reddit settings (Beta)',
      sectionYouTube: '3. YouTube settings',
      sectionProduct: '4. Product profile',
      sectionNotify: '5. Notifications',
      disabledHint: 'This platform is not enabled',
      betaBadge: 'Beta',
      redditBetaAllowedHint: '',
      redditBetaLockedHint: 'Reddit is still in Beta and is not open to this account yet.',
      redditProviderDisabledHint: 'Reddit data source is not enabled.',
      redditCommunities: 'Communities',
      redditCommunitiesDesc: 'Add Reddit community URLs (up to 3).',
      redditCommunityPlaceholder: 'e.g. https://www.reddit.com/r/AppleWatch/',
      redditKeywords: 'In-source keyword filter',
      redditKeywordsDesc:
        'Use the full product name you care about and avoid abbreviations whenever possible. Examples: AppleWatch, Huawei Watch GT2, Garmin Forerunner 970.',
      redditKeywordPlaceholder: 'e.g. HuaweiWatchGT2',
      youtubeKeywords: 'Keyword discovery',
      youtubeKeywordsDesc: '',
      youtubeKeywordsHint:
        'Use the full product name you care about and avoid abbreviations whenever possible. Examples: AppleWatch, Huawei Watch GT2, Garmin Forerunner 970.',
      youtubeKeywordPlaceholder: 'e.g. Amazfit Active 3',
      productInfoDesc: 'Add product links or description. We will auto-generate a product profile and automatically cover the product keywords you configured for YouTube and Reddit.',
      productWebsite: 'Official website URL',
      productCommerce: 'Commerce URL',
      productDescription: 'Product description',
      productDescriptionPlaceholder: 'e.g. Amazfit Helio Strap is a wearable focused on recovery, sleep tracking, heart rate monitoring, and exercise insights.',
      productProfileStatus: 'Profile status: ',
      productProfileBrand: 'Brand',
      productProfileName: 'Product name',
      productProfileCategory: 'Category',
      productProfileTargets: 'Target products',
      productProfileCoreFeatures: 'Core features',
      productProfileGeneratedAt: 'Last generated: ',
      emptyTargetProducts: 'No target products yet',
      addFeature: 'Add feature',
      emptyFeatures: 'No core features yet',
      saveProductSources: 'Save & generate profile',
      saveProductProfile: 'Save profile edits',
      productStatusIdle: 'Not generated',
      productStatusPending: 'Generating',
      productStatusReady: 'Generated',
      productStatusFailed: 'Failed',
      productStatusManual: 'Edited manually',
      toastNeedProductSource: 'Please provide at least one product information source',
      toastNeedFeature: 'Please enter a core feature first',
      toastProductProfileSaved: 'Product profile saved',
      addCommunity: 'Add community',
      addKeyword: 'Add keyword',
      notifyDesc: '',
      notifyEmail: 'Email',
      notifyEmailPlaceholder: 'name@example.com',
      notifyFeishu: 'Feishu',
      feishuSteps: 'Feishu webhook setup:',
      feishuStep1: '1) Create a Feishu group chat',
      feishuStep2: '2) In group settings (… on top right) go to Settings',
      feishuStep3: '3) Choose Group bots > Add bot > Custom bot',
      feishuStep4: '4) Copy the Webhook URL and save it below',
      feishuNotice: 'After saving the webhook, click “Test Feishu notification” and check your group.',
      feishuPlaceholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
      btnSave: 'Save',
      btnTestFeishu: 'Test Feishu notification',
      toastSaved: 'Saved',
      toastUpdateFail: 'Update failed',
      toastLoadFail: 'Failed to load config, please try again',
      toastSessionExpired: 'Session expired, please log in again',
      toastNeedPlatform: 'Select at least one platform',
      toastCommunityNeed: 'Please enter a community URL or r/name',
      toastCommunityInvalid: 'Invalid community format, use URL or r/name',
      toastCommunityMax: (n: number) => `You can add up to ${n} communities`,
      toastCommunityExist: 'Community already exists',
      toastKeywordNeed: 'Please enter a keyword',
      toastRedditKeywordMax: (n: number) => `Reddit supports up to ${n} keywords`,
      toastYoutubeKeywordMax: (n: number) => `YouTube supports up to ${n} keywords`,
      toastKeywordExist: 'Keyword already exists',
      toastNeedWebhook: 'Please save the Webhook first',
      toastFeishuTestOk: 'Test notification sent to Feishu',
      toastFeishuTestFail: 'Failed to send Feishu test notification',
      toastNeedEmail: 'Email cannot be empty',
      toastNeedNotifyChannel: 'Keep at least one notification channel',
      toastRedditBetaUnavailable: 'Reddit Beta is not open yet. Contact VoiceInsight to request access.',
      labelFeishuStatus: 'Feishu status: ',
      emptyCommunities: 'No communities yet',
      emptyKeywords: 'No keywords yet'
    }
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

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
        setProductWebsiteDraft(response.config.productWebsiteUrl ?? '');
        setProductCommerceDraft(response.config.productCommerceUrl ?? '');
        setProductDescriptionDraft(response.config.productDescription ?? '');
        setProductBrandDraft(response.config.productProfile.brand ?? '');
        setProductNameDraft(response.config.productProfile.productName ?? '');
        setProductCategoryDraft(response.config.productProfile.category ?? '');
        setProductProfileLocalDirty(false);
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : TEXT.toastLoadFail;
          if (/重新登录/.test(message) || /未登录/.test(message) || /401/.test(message)) {
            showToast(TEXT.toastSessionExpired, 'error');
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

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const maxRedditCommunities = meta?.maxRedditCommunities ?? 3;
  const maxRedditKeywords = meta?.maxRedditKeywords ?? 2;
  const maxYoutubeKeywords = meta?.maxYoutubeKeywords ?? 2;
  const supportedPlatforms = new Set(meta?.supportedPlatforms ?? ['youtube']);
  const redditProviderEnabled = supportedPlatforms.has('reddit');
  const redditBetaAllowed = Boolean(meta?.redditBetaAllowed);
  const canConfigureReddit = redditProviderEnabled && redditBetaAllowed;

  const accountStatusLabel = useMemo(() => {
    if (!user) return null;
    const map =
      lang === 'zh'
        ? USER_STATUS_LABEL
        : { trialing: 'Trial', active: 'Active', past_due: 'Past due', canceled: 'Canceled' };
    return map[user.status] ?? user.status;
  }, [lang, user]);

  const trialInfo = useMemo(() => {
    if (!user || user.status !== 'trialing' || !user.trialEndsAt) return null as null;
    const endsAt = new Date(user.trialEndsAt);
    if (Number.isNaN(endsAt.getTime())) return null as null;
    const diffDays = Math.ceil((endsAt.getTime() - Date.now()) / ONE_DAY_MS);
    const message =
      diffDays > 0
        ? lang === 'zh'
          ? `试用剩余 ${diffDays} 天（${endsAt.toLocaleDateString()} 到期）`
          : `Trial ends in ${diffDays} days (${endsAt.toLocaleDateString()})`
        : lang === 'zh'
          ? `试用已到期（${endsAt.toLocaleDateString()}）`
          : `Trial expired (${endsAt.toLocaleDateString()})`;
    return { message };
  }, [lang, user?.trialEndsAt]);

  type SearchConfigPatchInput = SearchConfigPatchPayload;

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
      setProductWebsiteDraft(updated.productWebsiteUrl ?? '');
      setProductCommerceDraft(updated.productCommerceUrl ?? '');
      setProductDescriptionDraft(updated.productDescription ?? '');
      setProductBrandDraft(updated.productProfile.brand ?? '');
      setProductNameDraft(updated.productProfile.productName ?? '');
      setProductCategoryDraft(updated.productProfile.category ?? '');
      if ('productProfile' in requestPayload) {
        setProductProfileLocalDirty(false);
      }
      if ('feishuWebhook' in requestPayload) {
        setFeishuDraft(updated.feishuWebhook ?? '');
      }
      showToast(TEXT.toastSaved);
    } catch (error) {
      setConfig(previous);
      setEmailDraft(previous.notifyEmail);
      setFeishuDraft(previous.feishuWebhook ?? '');
      setProductWebsiteDraft(previous.productWebsiteUrl ?? '');
      setProductCommerceDraft(previous.productCommerceUrl ?? '');
      setProductDescriptionDraft(previous.productDescription ?? '');
      setProductBrandDraft(previous.productProfile.brand ?? '');
      setProductNameDraft(previous.productProfile.productName ?? '');
      setProductCategoryDraft(previous.productProfile.category ?? '');
      if ('productProfile' in requestPayload) {
        setProductProfileLocalDirty(false);
      }
      showToast(error instanceof Error ? error.message : TEXT.toastUpdateFail, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePlatformToggle = async (platform: string) => {
    if (!config) return;
    if (platform === 'reddit' && !canConfigureReddit) {
      showToast(
        redditProviderEnabled ? TEXT.toastRedditBetaUnavailable : TEXT.redditProviderDisabledHint,
        'error'
      );
      return;
    }
    const current = new Set(config.platforms);
    if (current.has(platform)) {
      current.delete(platform);
      if (current.size === 0) {
        showToast(TEXT.toastNeedPlatform, 'error');
        return;
      }
    } else {
      current.add(platform);
    }
    const next = sortPlatforms(Array.from(current));
    await applyPatch({ platforms: next }, { platforms: next });
  };

  const handleAddRedditCommunity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;
    if (!canConfigureReddit) {
      showToast(TEXT.toastRedditBetaUnavailable, 'error');
      return;
    }
    const raw = redditCommunityInput.trim();
    if (!raw) {
      showToast(TEXT.toastCommunityNeed, 'error');
      return;
    }
    const normalized = normalizeRedditCommunity(raw);
    if (!normalized) {
      showToast(TEXT.toastCommunityInvalid, 'error');
      return;
    }
    if (config.redditCommunities.length >= maxRedditCommunities) {
      showToast(TEXT.toastCommunityMax(maxRedditCommunities), 'error');
      return;
    }
    const exists = config.redditCommunities.some(
      (item) => normalizeRedditCommunity(item)?.toLowerCase() === normalized.toLowerCase()
    );
    if (exists) {
      showToast(TEXT.toastCommunityExist, 'error');
      return;
    }
    const next = [...config.redditCommunities, normalized];
    setRedditCommunityInput('');
    await applyPatch({ redditCommunities: next }, { redditCommunities: next });
  };

  const handleRemoveRedditCommunity = async (community: string) => {
    if (!config) return;
    const next = config.redditCommunities.filter((item) => item !== community);
    await applyPatch({ redditCommunities: next }, { redditCommunities: next });
  };

  const handleAddRedditKeyword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;
    if (!canConfigureReddit) {
      showToast(TEXT.toastRedditBetaUnavailable, 'error');
      return;
    }
    const value = redditKeywordInput.trim();
    if (!value) {
      showToast(TEXT.toastKeywordNeed, 'error');
      return;
    }
    if (config.redditKeywords.length >= maxRedditKeywords) {
      showToast(TEXT.toastRedditKeywordMax(maxRedditKeywords), 'error');
      return;
    }
    const exists = config.redditKeywords.some((item) => item.toLowerCase() === value.toLowerCase());
    if (exists) {
      showToast(TEXT.toastKeywordExist, 'error');
      return;
    }
    const next = [...config.redditKeywords, value];
    setRedditKeywordInput('');
    await applyPatch({ redditKeywords: next }, { redditKeywords: next });
  };

  const handleRemoveRedditKeyword = async (keyword: string) => {
    if (!config) return;
    const next = config.redditKeywords.filter((item) => item !== keyword);
    await applyPatch({ redditKeywords: next }, { redditKeywords: next });
  };

  const handleAddYoutubeKeyword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;
    const value = youtubeKeywordInput.trim();
    if (!value) {
      showToast(TEXT.toastKeywordNeed, 'error');
      return;
    }
    if (config.youtubeKeywords.length >= maxYoutubeKeywords) {
      showToast(TEXT.toastYoutubeKeywordMax(maxYoutubeKeywords), 'error');
      return;
    }
    const exists = config.youtubeKeywords.some((item) => item.toLowerCase() === value.toLowerCase());
    if (exists) {
      showToast(TEXT.toastKeywordExist, 'error');
      return;
    }
    const next = [...config.youtubeKeywords, value];
    setYoutubeKeywordInput('');
    await applyPatch({ youtubeKeywords: next }, { youtubeKeywords: next });
  };

  const handleRemoveYoutubeKeyword = async (keyword: string) => {
    if (!config) return;
    const next = config.youtubeKeywords.filter((item) => item !== keyword);
    await applyPatch({ youtubeKeywords: next }, { youtubeKeywords: next });
  };

  const handleProductSourceSubmit = async () => {
    if (!config) return;
    const productWebsiteUrl = productWebsiteDraft.trim();
    const productCommerceUrl = productCommerceDraft.trim();
    const productDescription = productDescriptionDraft.trim();
    if (!productWebsiteUrl && !productCommerceUrl && !productDescription) {
      showToast(TEXT.toastNeedProductSource, 'error');
      return;
    }
    await applyPatch(
      {
        productWebsiteUrl,
        productCommerceUrl,
        productDescription
      },
      {
        productWebsiteUrl,
        productCommerceUrl,
        productDescription
      }
    );
  };

  const handleAddCoreFeature = () => {
    if (!config) return;
    const value = coreFeatureInput.trim();
    if (!value) {
      showToast(TEXT.toastNeedFeature, 'error');
      return;
    }
    const exists = config.productProfile.coreFeatures.some((item) => item.toLowerCase() === value.toLowerCase());
    if (exists) {
      setCoreFeatureInput('');
      return;
    }
    setConfig({
      ...config,
      productProfile: {
        ...config.productProfile,
        coreFeatures: [...config.productProfile.coreFeatures, value]
      }
    });
    setProductProfileLocalDirty(true);
    setCoreFeatureInput('');
  };

  const handleRemoveCoreFeature = (feature: string) => {
    if (!config) return;
    setConfig({
      ...config,
      productProfile: {
        ...config.productProfile,
        coreFeatures: config.productProfile.coreFeatures.filter((item) => item !== feature)
      }
    });
    setProductProfileLocalDirty(true);
  };

  const handleSaveProductProfile = async () => {
    if (!config) return;
    const nextProfile = {
      brand: productBrandDraft.trim(),
      productName: productNameDraft.trim(),
      category: productCategoryDraft.trim(),
      coreFeatures: config.productProfile.coreFeatures,
      targetProducts: config.productProfile.targetProducts
    };

    await applyPatch(
      {
        productProfile: {
          ...config.productProfile,
          ...nextProfile,
          status: 'manual',
          updatedByUser: true
        }
      },
      {
        productProfile: nextProfile
      }
    );
  };

  const handleChannelToggle = async (channel: 'email' | 'feishu') => {
    if (!config) return;
    const current = new Set(config.notifyChannels);
    if (current.has(channel)) {
      if (current.size === 1) {
        showToast(TEXT.toastNeedNotifyChannel, 'error');
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
      showToast(TEXT.toastNeedWebhook, 'error');
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
      showToast(TEXT.toastFeishuTestOk, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : TEXT.toastFeishuTestFail;
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
      showToast(TEXT.toastNeedEmail, 'error');
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
      showToast(lang === 'zh' ? '已退出登录' : 'Logged out');
      navigate('/');
    } catch {
      showToast(lang === 'zh' ? '退出失败，请稍后再试' : 'Failed to log out', 'error');
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
        <img src="/assets/logos/logo.png" alt="VoiceInsight" className="logo-img" />
        <span className="logo-word">
          Voice<span className="logo-word__accent">Insight</span>
        </span>
      </Link>
      <div className="dashboard-nav__actions" ref={avatarRef}>
        <div className="nav-lang" ref={langRef}>
          <button type="button" className="btn text" onClick={() => setLangOpen((v) => !v)}>
            {NAV_TEXT.language}
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
                {NAV_TEXT.zh}
              </button>
              <button
                type="button"
                className={`nav-lang__item${lang === 'en' ? ' is-active' : ''}`}
                onClick={() => {
                  setLang('en');
                  setLangOpen(false);
                }}
              >
                {NAV_TEXT.en}
              </button>
            </div>
          ) : null}
        </div>
        <div className="nav-avatar-wrapper">
          <button
            type="button"
            className="dashboard-avatar"
            onClick={handleAvatarClick}
            aria-label={NAV_TEXT.open}
          >
            {(user.email?.[0] ?? 'U').toUpperCase()}
          </button>
          {menuOpen ? (
            <div className="account-popover account-popover--dashboard">
              <div className="account-popover__header">
                <strong>{user.email}</strong>
              </div>
              {accountStatusLabel ? (
                <p className="account-popover__status">
                  {NAV_TEXT.status}
                  {accountStatusLabel}
                </p>
              ) : null}
              {trialInfo ? <p className="account-popover__status">{trialInfo.message}</p> : null}
              <button type="button" className="btn secondary" onClick={() => void handleLogout()} disabled={logoutLoading}>
                {logoutLoading ? NAV_TEXT.loggingOut : NAV_TEXT.logout}
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
              <h1>{TEXT.loading}</h1>
              <p>{TEXT.loading}</p>
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
              <h1>{TEXT.title}</h1>
              <p>{TEXT.toastLoadFail}</p>
            </div>
            <Link to="/app" className="config-link">
              {lang === 'zh' ? '返回控制台' : 'Back to dashboard'}
            </Link>
          </header>
        </div>
      </div>
    );
  }

  const feishuEnabled = config.notifyChannels.includes('feishu');
  const emailEnabled = config.notifyChannels.includes('email');
  const feishuStatusLabel =
    config.feishuStatus === 'ok'
      ? lang === 'zh'
        ? '可用'
        : 'OK'
      : config.feishuStatus === 'failed'
        ? lang === 'zh'
          ? '测试失败'
          : 'Failed'
        : lang === 'zh'
          ? '待测试'
          : 'Not tested';
  const feishuLastTestDisplay = config.feishuLastTestedAt
    ? new Date(config.feishuLastTestedAt).toLocaleString()
    : lang === 'zh'
      ? '尚未测试'
      : 'Not tested';
  const feishuWebhookDirty =
    feishuDraft.trim() !== (config?.feishuWebhook ? config.feishuWebhook.trim() : '');
  const productSourceDirty =
    productWebsiteDraft.trim() !== (config.productWebsiteUrl?.trim() ?? '') ||
    productCommerceDraft.trim() !== (config.productCommerceUrl?.trim() ?? '') ||
    productDescriptionDraft.trim() !== (config.productDescription?.trim() ?? '');
  const productProfileDirty =
    productBrandDraft.trim() !== (config.productProfile.brand?.trim() ?? '') ||
    productNameDraft.trim() !== (config.productProfile.productName?.trim() ?? '') ||
    productCategoryDraft.trim() !== (config.productProfile.category?.trim() ?? '') ||
    productProfileLocalDirty;
  const productProfileStatusLabel =
    config.productProfile.updatedByUser
      ? TEXT.productStatusManual
      : config.productProfile.status === 'pending'
        ? TEXT.productStatusPending
        : config.productProfile.status === 'ready'
          ? TEXT.productStatusReady
          : config.productProfile.status === 'failed'
            ? TEXT.productStatusFailed
            : TEXT.productStatusIdle;
  const productGeneratedAtDisplay = config.productProfile.generatedAt
    ? new Date(config.productProfile.generatedAt).toLocaleString()
    : lang === 'zh'
      ? '尚未生成'
      : 'Not generated';

  return (
    <>
      <div className="dashboard">
        {AccountNav}
        <div className="dashboard-shell config-page">
          <header className="config-header">
            <div>
              <h1>{TEXT.title}</h1>
              <p>{TEXT.subtitle}</p>
            </div>
            <Link to="/app" className="config-link">
              {lang === 'zh' ? '返回控制台' : 'Back to dashboard'}
            </Link>
          </header>

          <section className="config-section">
            <h3>{TEXT.sectionPlatform}</h3>
            {TEXT.sectionPlatformDesc ? <p className="config-section__hint">{TEXT.sectionPlatformDesc}</p> : null}
            <div className="platform-toggle">
              {PLATFORM_OPTIONS.map((option) => {
                const isReddit = option.value === 'reddit';
                const locked = isReddit && !canConfigureReddit;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`platform-option ${config.platforms.includes(option.value) ? 'active' : ''}`}
                    onClick={() => void handlePlatformToggle(option.value)}
                    disabled={saving || locked}
                    title={locked ? (redditProviderEnabled ? TEXT.redditBetaLockedHint : TEXT.redditProviderDisabledHint) : undefined}
                  >
                    <span className="platform-option__content">
                      {option.label}
                      {isReddit ? <span className="platform-option__badge">{TEXT.betaBadge}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {!redditProviderEnabled ? (
              <p className="config-section__hint">{TEXT.redditProviderDisabledHint}</p>
            ) : redditBetaAllowed ? (
              TEXT.redditBetaAllowedHint ? <p className="config-section__hint">{TEXT.redditBetaAllowedHint}</p> : null
            ) : (
              <p className="config-section__hint">{TEXT.redditBetaLockedHint}</p>
            )}
          </section>

          <section className="config-section">
            <div className="config-section__header">
              <h3>{TEXT.sectionReddit}</h3>
              <span className="config-section__hint">{`Max ${maxRedditCommunities} communities / ${maxRedditKeywords} keywords`}</span>
            </div>
            {!canConfigureReddit ? (
              <p className="config-section__hint">
                {redditProviderEnabled ? TEXT.redditBetaLockedHint : TEXT.redditProviderDisabledHint}
              </p>
            ) : !config.platforms.includes('reddit') ? (
              <p className="config-section__hint">{TEXT.disabledHint}</p>
            ) : (
              <>
                <p className="config-section__hint">{TEXT.redditCommunitiesDesc}</p>
                <div className="config-chip-list">
                  {config.redditCommunities.map((community) => (
                    <span key={community} className="config-chip">
                      {community}
                      <button
                        type="button"
                        className="config-chip__remove"
                        onClick={() => void handleRemoveRedditCommunity(community)}
                        disabled={saving}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {config.redditCommunities.length === 0 ? (
                    <span className="config-empty">{TEXT.emptyCommunities}</span>
                  ) : null}
                </div>
                <form className="config-inline-form" onSubmit={(event) => void handleAddRedditCommunity(event)}>
                  <input
                    type="text"
                    value={redditCommunityInput}
                    onChange={(event) => setRedditCommunityInput(event.target.value)}
                    placeholder={TEXT.redditCommunityPlaceholder}
                    disabled={saving}
                  />
                  <button type="submit" disabled={saving || config.redditCommunities.length >= maxRedditCommunities}>
                    {TEXT.addCommunity}
                  </button>
                </form>

                {TEXT.redditKeywordsDesc ? <p className="config-section__hint">{TEXT.redditKeywordsDesc}</p> : null}
                <div className="config-chip-list">
                  {config.redditKeywords.map((keyword) => (
                    <span key={keyword} className="config-chip">
                      {keyword}
                      <button
                        type="button"
                        className="config-chip__remove"
                        onClick={() => void handleRemoveRedditKeyword(keyword)}
                        disabled={saving}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {config.redditKeywords.length === 0 ? (
                    <span className="config-empty">{TEXT.emptyKeywords}</span>
                  ) : null}
                </div>
                <form className="config-inline-form" onSubmit={(event) => void handleAddRedditKeyword(event)}>
                  <input
                    type="text"
                    value={redditKeywordInput}
                    onChange={(event) => setRedditKeywordInput(event.target.value)}
                    placeholder={TEXT.redditKeywordPlaceholder}
                    disabled={saving}
                  />
                  <button type="submit" disabled={saving || config.redditKeywords.length >= maxRedditKeywords}>
                    {TEXT.addKeyword}
                  </button>
                </form>
              </>
            )}
          </section>

          <section className="config-section">
            <div className="config-section__header">
              <h3>{TEXT.sectionYouTube}</h3>
              <span className="config-section__hint">{`Max ${maxYoutubeKeywords} keywords`}</span>
            </div>
            {!config.platforms.includes('youtube') ? (
              <p className="config-section__hint">{TEXT.disabledHint}</p>
            ) : (
              <>
                {TEXT.youtubeKeywordsDesc ? <p className="config-section__hint">{TEXT.youtubeKeywordsDesc}</p> : null}
                {TEXT.youtubeKeywordsHint ? <p className="config-section__hint">{TEXT.youtubeKeywordsHint}</p> : null}
                <div className="config-chip-list">
                  {config.youtubeKeywords.map((keyword) => (
                    <span key={keyword} className="config-chip">
                      {keyword}
                      <button
                        type="button"
                        className="config-chip__remove"
                        onClick={() => void handleRemoveYoutubeKeyword(keyword)}
                        disabled={saving}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {config.youtubeKeywords.length === 0 ? (
                    <span className="config-empty">{TEXT.emptyKeywords}</span>
                  ) : null}
                </div>
                <form className="config-inline-form" onSubmit={(event) => void handleAddYoutubeKeyword(event)}>
                  <input
                    type="text"
                    value={youtubeKeywordInput}
                    onChange={(event) => setYoutubeKeywordInput(event.target.value)}
                    placeholder={TEXT.youtubeKeywordPlaceholder}
                    disabled={saving}
                  />
                  <button type="submit" disabled={saving || config.youtubeKeywords.length >= maxYoutubeKeywords}>
                    {TEXT.addKeyword}
                  </button>
                </form>
              </>
            )}
          </section>

          <section className="config-section">
            <h3>{TEXT.sectionProduct}</h3>
            <p className="config-section__hint">{TEXT.productInfoDesc}</p>
            <div className="config-inline-form config-inline-form--single">
              <input
                type="url"
                value={productWebsiteDraft}
                onChange={(event) => setProductWebsiteDraft(event.target.value)}
                placeholder={TEXT.productWebsite}
                disabled={saving}
              />
            </div>
            <div className="config-inline-form config-inline-form--single">
              <input
                type="url"
                value={productCommerceDraft}
                onChange={(event) => setProductCommerceDraft(event.target.value)}
                placeholder={TEXT.productCommerce}
                disabled={saving}
              />
            </div>
            <div className="config-inline-form config-inline-form--single">
              <textarea
                value={productDescriptionDraft}
                onChange={(event) => setProductDescriptionDraft(event.target.value)}
                placeholder={TEXT.productDescriptionPlaceholder}
                disabled={saving}
                rows={4}
              />
            </div>
            <div className="config-inline-form config-inline-form--single">
              <button type="button" onClick={() => void handleProductSourceSubmit()} disabled={saving || !productSourceDirty}>
                {TEXT.saveProductSources}
              </button>
            </div>
            <p className="config-section__hint">
              {TEXT.productProfileStatus}
              {productProfileStatusLabel} · {TEXT.productProfileGeneratedAt}
              {productGeneratedAtDisplay}
            </p>
            {config.productProfile.error ? (
              <p className="config-section__hint" style={{ color: '#d14343' }}>
                {config.productProfile.error}
              </p>
            ) : null}
            <div className="config-inline-form config-inline-form--single">
              <input
                type="text"
                value={productBrandDraft}
                onChange={(event) => setProductBrandDraft(event.target.value)}
                placeholder={TEXT.productProfileBrand}
                disabled={saving}
              />
            </div>
            <div className="config-inline-form config-inline-form--single">
              <input
                type="text"
                value={productNameDraft}
                onChange={(event) => setProductNameDraft(event.target.value)}
                placeholder={TEXT.productProfileName}
                disabled={saving}
              />
            </div>
            <div className="config-inline-form config-inline-form--single">
              <input
                type="text"
                value={productCategoryDraft}
                onChange={(event) => setProductCategoryDraft(event.target.value)}
                placeholder={TEXT.productProfileCategory}
                disabled={saving}
              />
            </div>

            <p className="config-section__hint">{TEXT.productProfileTargets}</p>
            <div className="config-chip-list">
              {config.productProfile.targetProducts.map((target) => (
                <span key={target.name} className="config-chip">
                  {target.name}
                </span>
              ))}
              {config.productProfile.targetProducts.length === 0 ? (
                <span className="config-empty">{TEXT.emptyTargetProducts}</span>
              ) : null}
            </div>

            <p className="config-section__hint">{TEXT.productProfileCoreFeatures}</p>
            <div className="config-chip-list">
              {config.productProfile.coreFeatures.map((feature) => (
                <span key={feature} className="config-chip">
                  {feature}
                  <button
                    type="button"
                    className="config-chip__remove"
                    onClick={() => handleRemoveCoreFeature(feature)}
                    disabled={saving}
                  >
                    ×
                  </button>
                </span>
              ))}
              {config.productProfile.coreFeatures.length === 0 ? (
                <span className="config-empty">{TEXT.emptyFeatures}</span>
              ) : null}
            </div>
            <div className="config-inline-form">
              <input
                type="text"
                value={coreFeatureInput}
                onChange={(event) => setCoreFeatureInput(event.target.value)}
                placeholder={TEXT.productProfileCoreFeatures}
                disabled={saving}
              />
              <button type="button" onClick={handleAddCoreFeature} disabled={saving}>
                {TEXT.addFeature}
              </button>
            </div>

            <div className="config-inline-form config-inline-form--single">
              <button type="button" onClick={() => void handleSaveProductProfile()} disabled={saving || !productProfileDirty}>
                {TEXT.saveProductProfile}
              </button>
            </div>
          </section>

          <section className="config-section">
            <h3>{TEXT.sectionNotify}</h3>
            {TEXT.notifyDesc ? <p className="config-section__hint">{TEXT.notifyDesc}</p> : null}
            <div className="platform-toggle">
              {CHANNEL_ORDER.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  className={`platform-option ${config.notifyChannels.includes(channel) ? 'active' : ''}`}
                  onClick={() => void handleChannelToggle(channel)}
                  disabled={saving}
                >
                  {channel === 'email' ? TEXT.notifyEmail : TEXT.notifyFeishu}
                </button>
              ))}
            </div>
            {feishuEnabled ? (
              <>
                <p className="config-section__hint">
                  {TEXT.feishuSteps}
                  <br />
                  {TEXT.feishuStep1}
                  <br />
                  {TEXT.feishuStep2}
                  <br />
                  {TEXT.feishuStep3}
                  <br />
                  {TEXT.feishuStep4}
                </p>
                <p className="config-section__hint config-section__hint--tight">{TEXT.feishuNotice}</p>
                <div className="config-inline-form">
                  <input
                    type="url"
                    value={feishuDraft}
                    onChange={(event) => setFeishuDraft(event.target.value)}
                    placeholder={TEXT.feishuPlaceholder}
                    disabled={saving}
                  />
                  <button type="button" onClick={() => void handleFeishuSubmit()} disabled={saving || !feishuWebhookDirty}>
                    {TEXT.btnSave}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFeishuTest()}
                    disabled={saving || testingFeishu || !config.feishuWebhook}
                  >
                    {testingFeishu ? (lang === 'zh' ? '测试中…' : 'Testing...') : TEXT.btnTestFeishu}
                  </button>
                </div>
                <p className="config-section__hint">
                  {TEXT.labelFeishuStatus}
                  {feishuStatusLabel} · {feishuLastTestDisplay}
                </p>
              </>
            ) : null}
            {emailEnabled ? (
              <>
                <p className="config-section__hint">
                  {lang === 'zh'
                    ? '邮件通知将发送到以下邮箱，可修改为其他地址。'
                    : 'Email notifications will be sent to the address below.'}
                </p>
                <div className="config-inline-form config-inline-form--single">
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    onBlur={() => void handleEmailSubmit()}
                    placeholder={TEXT.notifyEmailPlaceholder}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => void handleEmailSubmit()}
                    disabled={saving || emailDraft.trim() === config.notifyEmail.trim()}
                  >
                    {TEXT.btnSave}
                  </button>
                </div>
              </>
            ) : null}
          </section>

          {toast ? (
            <div className="toast-container">
              <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            </div>
          ) : null}
        </div>
      </div>

      {adminModalOpen ? (
        <div className="admin-password-modal">
          <form className="admin-password-card" onSubmit={handleAdminPasswordSubmit}>
            <h3>{lang === 'zh' ? '输入管理员密码' : 'Enter admin password'}</h3>
            <p className="plan-meta">{lang === 'zh' ? '完成验证后将进入管理平台。' : 'After verification you will enter admin console.'}</p>
            <input
              type="password"
              value={adminPasswordInput}
              onChange={(event) => setAdminPasswordInput(event.target.value)}
              placeholder={lang === 'zh' ? '管理员密码' : 'Admin password'}
              autoFocus
            />
            {adminPasswordError ? <div className="subscription-error">{adminPasswordError}</div> : null}
            <div className="admin-password-card__actions">
              <button type="button" className="btn secondary" onClick={() => setAdminModalOpen(false)}>
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button type="submit" className="btn primary">
                {lang === 'zh' ? '确定' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function normalizeRedditCommunity(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    const index = segments.findIndex((item) => item.toLowerCase() === 'r');
    if (index >= 0 && segments[index + 1]) {
      const name = segments[index + 1].trim();
      if (/^[A-Za-z0-9_]{2,32}$/.test(name)) {
        return `https://www.reddit.com/r/${name}/`;
      }
    }
  } catch {
    // not URL, continue as shorthand
  }

  const short = trimmed.match(/^r\/([A-Za-z0-9_]{2,32})$/i);
  if (short?.[1]) {
    return `https://www.reddit.com/r/${short[1]}/`;
  }

  if (/^[A-Za-z0-9_]{2,32}$/.test(trimmed)) {
    return `https://www.reddit.com/r/${trimmed}/`;
  }

  return null;
}
