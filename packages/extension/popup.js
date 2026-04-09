const DEBUG_BUILD_LABEL = "v1.2.0-debug";
const WEBSITE_HOME_URL = "https://www.voiceinsight.cloud";
const DEFAULT_API_BASE = DEBUG_BUILD_LABEL.includes("debug")
  ? "http://127.0.0.1:8080"
  : WEBSITE_HOME_URL;
// Transcript extraction is centralized in popup main-world flow.
// contentScript/background remain lightweight bridges only.
const LOCALE_STORAGE_KEY = "voiceInsightLocaleOverride";
const TRANSCRIPT_FALLBACK_PATH = "/api/youtube/transcript";
const API_BASE_STORAGE_KEY = "voiceInsightApiBaseOverride";
const DEBUG_UNLOCK_TAP_STORAGE_KEY = "voiceInsightDebugUnlockPopupTaps";
const AUTO_REFRESH_DEBOUNCE_MS = 420;
const ACTIVE_VIDEO_POLL_MS = 2000;
const DEBUG_PANEL_UNLOCK_WINDOW_MS = 10_000;
const DEBUG_PANEL_UNLOCK_TAP_COUNT = 10;
const CONTEXT_GATE_TIMEOUT_MS = 9600;
const CONTEXT_GATE_STABLE_MS = 760;
const VOICEINSIGHT_API_TIMEOUT_FLOOR_MS = Object.freeze({
  auto: 6500,
  open: 7200,
  manual: 8200,
});
const VOICEINSIGHT_API_TIMEOUT_CEIL_MS = 18_000;
const VOICEINSIGHT_API_TIMEOUT_OVERHEAD_MS = 1_200;
const VOICEINSIGHT_API_TIMEOUT_PER_ENGINE_OVERHEAD_MS = 450;
const VOICEINSIGHT_API_ENGINE_TIMEOUT_MS = Object.freeze({
  youtubeTranscriptApi: 4500,
  ytDlp: 5500,
});
const PRIMARY_CAPTURE_TIMEOUT_MS = Object.freeze({
  auto: 5200,
  open: 5600,
  manual: 6600,
});
const PRIMARY_CAPTURE_MAX_ATTEMPTS = Object.freeze({
  auto: 1,
  open: 1,
  manual: 2,
});
const AGENT_HEALTH_PATH = "/health";
const AGENT_HEALTH_TIMEOUT_MS = 1200;
const AGENT_HEALTH_RETRY_DELAYS_MS = [0, 260, 620];
const AGENT_LAUNCHER_PORT = 17846;
const AGENT_LAUNCHER_HEALTH_PATH = "/health";
const AGENT_LAUNCHER_WAKE_PATH = "/wake";
const AGENT_LAUNCHER_TIMEOUT_MS = 1200;
const AGENT_WAKE_HEALTH_RETRY_DELAYS_MS = [240, 480, 860, 1260];
const AGENT_INSTALL_GUIDE_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const AGENT_INSTALL_GUIDE_TS_STORAGE_KEY = "voiceInsightAgentInstallGuideTs";
const AGENT_LAST_HEALTHY_TS_STORAGE_KEY = "voiceInsightAgentLastHealthyTs";
const TIMESTAMP_ALIGN_PROBE_TIMEOUT_MS = 900;
const TIMESTAMP_ALIGN_OPEN_PANEL_PROBE_TIMEOUT_MS = 1800;
const TIMESTAMP_ALIGN_MIN_ANCHORS = 2;
const TIMESTAMP_ALIGN_QUALITY_MIN_COVERAGE = 0.58;
const TIMESTAMP_ALIGN_EXPECTED_ANCHOR_SPAN_SEC = 36;
const VOICEINSIGHT_ENGINE_ORDER = Object.freeze([
  "youtube-transcript-api",
  "yt-dlp",
]);
const CHANNEL_YT_PANEL_TRANSCRIPT = "YT_PANEL_TRANSCRIPT";
const CHANNEL_YT_PANEL_TRANSCRIPT_LABEL = "YouTube 面板字幕通道";
const CHANNEL_YT_CAPTION_TRACK = "YT_CAPTION_TRACK";
const CHANNEL_YT_TIMEDTEXT = "YT_TIMEDTEXT";
const CHANNEL_YT_INNERTUBE = "YT_INNERTUBE";
const CHANNEL_VI_API = "VI_CLOUD_API";
const CHANNEL_VI_AGENT = "VI_AGENT";
const CHANNEL_LABELS = Object.freeze({
  [CHANNEL_YT_PANEL_TRANSCRIPT]: "YouTube 面板字幕通道",
  [CHANNEL_YT_CAPTION_TRACK]: "YouTube 字幕轨道通道",
  [CHANNEL_YT_TIMEDTEXT]: "YouTube timedtext 通道",
  [CHANNEL_YT_INNERTUBE]: "YouTube innertube 通道",
  [CHANNEL_VI_API]: "VoiceInsight 云端通道",
  [CHANNEL_VI_AGENT]: "VoiceInsight Agent 通道",
});
const DIAGNOSTICS_PROTOCOL_VERSION = "vi_diag_v2";
const DIAGNOSTICS_EXPORT_MODE = Object.freeze({
  compact: "compact",
  full: "full",
});
const ACTIVE_DIAGNOSTICS_EXPORT_MODE = DIAGNOSTICS_EXPORT_MODE.compact;
const DIAGNOSTICS_COMPACT_MAX_EVENTS = 120;
const TRANSCRIPT_CHANNEL_MODE = Object.freeze({
  fullChain: "FULL_CHAIN",
  ytPanelTranscriptOnly: "YT_PANEL_TRANSCRIPT_ONLY",
  ytTimedtextOnly: "YT_TIMEDTEXT_ONLY",
  ytTimedtextThenPanel: "YT_TIMEDTEXT_THEN_PANEL",
});
const TRANSCRIPT_STRATEGY_FULL_CHAIN = "TRANSCRIPT_CHAIN_FULL";
const TRANSCRIPT_STRATEGY_TIMEDTEXT_THEN_PANEL =
  "TRANSCRIPT_CHAIN_YT_TIMEDTEXT_THEN_PANEL";
const ACTIVE_TRANSCRIPT_CHANNEL_MODE =
  TRANSCRIPT_CHANNEL_MODE.ytTimedtextThenPanel;
const VOICEINSIGHT_ENGINE_BACKOFF_MAX_MS = 15 * 60 * 1000;
const VOICEINSIGHT_ENGINE_BACKOFF_BASE_MS = Object.freeze({
  "youtube-transcript-api": Object.freeze({
    blocked: 2 * 60 * 1000,
    timeout: 40 * 1000,
    generic: 30 * 1000,
  }),
  "yt-dlp": Object.freeze({
    blocked: 90 * 1000,
    timeout: 35 * 1000,
    generic: 25 * 1000,
    proxy: 4 * 60 * 1000,
  }),
});
const YOUTUBE_COOKIE_BRIDGE_ALLOWLIST = Object.freeze([
  "VISITOR_INFO1_LIVE",
  "PREF",
  "YSC",
  "GPS",
  "CONSENT",
  "SOCS",
  "LOGIN_INFO",
  "SID",
  "HSID",
  "SSID",
  "APISID",
  "SAPISID",
  "__Secure-1PAPISID",
  "__Secure-3PAPISID",
  "__Secure-1PSID",
  "__Secure-3PSID",
  "__Secure-1PSIDTS",
  "__Secure-3PSIDTS",
  "__Secure-1PSIDCC",
  "__Secure-3PSIDCC",
]);
const YOUTUBE_COOKIE_BRIDGE_MAX_HEADER_BYTES = 6800;

const isYtPanelTranscriptOnlyMode = () =>
  ACTIVE_TRANSCRIPT_CHANNEL_MODE === TRANSCRIPT_CHANNEL_MODE.ytPanelTranscriptOnly;

const isYtTimedtextOnlyMode = () =>
  ACTIVE_TRANSCRIPT_CHANNEL_MODE === TRANSCRIPT_CHANNEL_MODE.ytTimedtextOnly;

const isYtTimedtextThenPanelMode = () =>
  ACTIVE_TRANSCRIPT_CHANNEL_MODE ===
  TRANSCRIPT_CHANNEL_MODE.ytTimedtextThenPanel;

const getActiveTranscriptStrategy = () =>
  isYtPanelTranscriptOnlyMode()
    ? CHANNEL_YT_PANEL_TRANSCRIPT
    : isYtTimedtextOnlyMode()
    ? CHANNEL_YT_TIMEDTEXT
    : isYtTimedtextThenPanelMode()
    ? TRANSCRIPT_STRATEGY_TIMEDTEXT_THEN_PANEL
    : TRANSCRIPT_STRATEGY_FULL_CHAIN;

const I18N = {
  zh: {
    app_title: "VoiceInsight",
    app_subtitle: "YouTube 字幕助手",
    lang_zh: "中",
    lang_en: "EN",
    lang_toggle_aria: "语言切换",
    action_download: "下载字幕",
    action_time: "时间",
    action_copy: "复制字幕",
    action_refresh: "刷新",
    format_txt: "TXT",
    format_srt: "SRT",
    format_vtt: "VTT",
    section_transcript: "字幕内容",
    transcript_language: "语言：{language}",
    transcript_language_unknown: "未知",
    status_loading: "正在提取字幕，请稍候...",
    status_success: "字幕提取成功。",
    status_copied: "字幕已复制到剪贴板。",
    status_downloaded: "字幕已下载：{format}",
    status_error_open_youtube: "请先打开 YouTube 视频页面。",
    status_error_generic: "操作失败，请稍后重试。",
    status_error_agent_required:
      "本地 Agent 未就绪，请先安装并启动后重试。",
    status_error_download: "字幕下载失败，请稍后重试。",
    status_error_copy: "复制失败，请稍后重试。",
    status_diagnostics_copied: "诊断日志已复制。",
    error_captions_not_found: "该视频无字幕可下载。",
    action_copy_diagnostics: "复制诊断日志",
    debug_code_prefix: "诊断码",
    debug_code_none: "无",
    debug_process_title: "字幕提取过程",
    debug_process_empty: "暂无业务日志",
    empty_error_title: "该视频无字幕可下载",
    empty_error_text: "可先切换其他视频后重试。",
    loading_card: "字幕提取中...",
    footer_hint_prefix: "更多功能请访问",
    footer_hint_link: "VoiceInsight官网",
  },
  en: {
    app_title: "VoiceInsight",
    app_subtitle: "YouTube Subtitle Assistant",
    lang_zh: "中",
    lang_en: "EN",
    lang_toggle_aria: "Language Switch",
    action_download: "Download Subtitles",
    action_time: "Time",
    action_copy: "Copy Transcript",
    action_refresh: "Refresh",
    format_txt: "TXT",
    format_srt: "SRT",
    format_vtt: "VTT",
    section_transcript: "Transcript",
    transcript_language: "Language: {language}",
    transcript_language_unknown: "Unknown",
    status_loading: "Extracting subtitles, please wait...",
    status_success: "Subtitles extracted.",
    status_copied: "Transcript copied to clipboard.",
    status_downloaded: "Downloaded: {format}",
    status_error_open_youtube: "Please open a YouTube video page first.",
    status_error_generic: "Operation failed. Please try again.",
    status_error_agent_required:
      "Local Agent is not ready. Please install/start Agent and retry.",
    status_error_download: "Subtitle download failed. Please try again.",
    status_error_copy: "Copy failed. Please try again.",
    status_diagnostics_copied: "Diagnostics copied.",
    error_captions_not_found: "No subtitles are available for download for this video.",
    action_copy_diagnostics: "Copy Diagnostics",
    debug_code_prefix: "Diag Code",
    debug_code_none: "N/A",
    debug_process_title: "Subtitle Extraction Process",
    debug_process_empty: "No process events yet.",
    empty_error_title: "No subtitle track available",
    empty_error_text: "Try another video and then retry.",
    loading_card: "Extracting subtitle timeline...",
    footer_hint_prefix: "Visit VoiceInsight website for more features:",
    footer_hint_link: "VoiceInsight Website",
  },
};

const state = {
  locale: detectLocale(),
  status: "loading",
  statusKey: "status_loading",
  statusClass: "loading",
  statusParams: null,
  statusOverride: null,
  rawLines: [],
  lines: [],
  activeIndex: 0,
  timeModeEnabled: true,
  format: "txt",
  tabId: null,
  videoId: "",
  videoTitle: "",
  videoUrl: "",
  transcriptLanguageCode: "",
  transcriptLanguageName: "",
  transcriptIsAutoGenerated: false,
  transcriptSource: "",
  autoBlockedVideoId: "",
  actionBusy: false,
  debugCode: "N/A",
  diagnosticsText: "",
  diagnosticsRun: null,
  businessLogs: [],
  debugPanelVisible: false,
  debugTapTimestamps: [],
  voiceInsightEngines: createVoiceInsightEngineRuntimeState(),
};

let overrideTimer = null;
let refreshPromise = null;
let autoRefreshTimer = null;
let activeVideoPollTimer = null;
let lastVisibilityState = document.visibilityState;
let pendingAutoRefresh = {
  reason: "",
  expectedVideoId: "",
  mode: "auto",
  force: false,
  bypassBlock: false,
};

const lineListEl = document.getElementById("lineList");
const transcriptLangEl = document.getElementById("transcriptLang");
const formatSelectEl = document.getElementById("formatSelect");
const timeToggleBtnEl = document.getElementById("timeToggleBtn");
const downloadBtnEl = document.getElementById("downloadBtn");
const copyBtnEl = document.getElementById("copyBtn");
const refreshBtnEl = document.getElementById("refreshBtn");
const guideLinkEl = document.getElementById("guideLink");
const statusToastEl = document.getElementById("statusToast");
const brandLogoEl = document.getElementById("brandLogo");
const debugWrapEl = document.getElementById("debugWrap");
const copyDiagBtnEl = document.getElementById("copyDiagBtn");
const debugBizListEl = document.getElementById("debugBizList");
const langZhBtn = document.getElementById("langZh");
const langEnBtn = document.getElementById("langEn");

const REQUIRED_POPUP_SHARED_HELPERS = Object.freeze([
  "normalizeLineText",
  "sanitizeTranscriptLineText",
  "normalizeTimestamp",
  "formatClock",
  "parseTimestampToSeconds",
  "getLineSeconds",
  "buildExportText",
  "buildTxtText",
  "normalizeExportFormat",
  "getMimeTypeByFormat",
  "decodeEntities",
  "parseTimelinePayload",
  "ensureCaptionUrl",
]);

function ensurePopupSharedHelpersReady() {
  const missing = REQUIRED_POPUP_SHARED_HELPERS.filter(
    (name) => typeof globalThis?.[name] !== "function"
  );
  if (missing.length === 0) {
    return;
  }

  console.error("[voiceinsight][popup] missing shared helpers", missing);
  throw new Error(`popup_shared_helpers_missing:${missing.join(",")}`);
}

ensurePopupSharedHelpersReady();

void init();

async function init() {
  bindEvents();
  await initLocale();
  await hydrateDebugPanelVisibilityFromIconTaps();
  applyI18n();
  render();
  startActiveVideoWatchers();
  await refreshTranscript(true, {
    mode: "open",
    reason: "panel_init",
    bypassBlock: true,
  });
}

function bindEvents() {
  langZhBtn?.addEventListener("click", () => setLocale("zh"));
  langEnBtn?.addEventListener("click", () => setLocale("en"));

  formatSelectEl?.addEventListener("change", (event) => {
    state.format = normalizeExportFormat(event.target?.value);
  });

  timeToggleBtnEl?.addEventListener("click", () => {
    state.timeModeEnabled = !state.timeModeEnabled;
    rebuildDisplayLines();
    state.activeIndex = 0;
    render();
  });

  downloadBtnEl?.addEventListener("click", () => {
    void handleDownloadClick();
  });

  copyBtnEl?.addEventListener("click", () => {
    void handleCopyClick();
  });

  refreshBtnEl?.addEventListener("click", () => {
    void handleManualRefreshClick();
  });

  guideLinkEl?.addEventListener("click", () => {
    chrome.tabs.create({ url: WEBSITE_HOME_URL });
  });

  brandLogoEl?.addEventListener("click", () => {
    handleDebugUnlockTap();
  });

  copyDiagBtnEl?.addEventListener("click", () => {
    void copyDiagnostics();
  });

  lineListEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest(".line");
    if (!item) return;
    const index = Number.parseInt(item.getAttribute("data-index") || "", 10);
    if (!Number.isInteger(index)) return;
    state.activeIndex = index;
    renderLineList();
  });

  document.addEventListener("visibilitychange", () => {
    if (
      lastVisibilityState !== "visible" &&
      document.visibilityState === "visible"
    ) {
      scheduleAutoRefresh("panel_open_visible", "", {
        mode: "open",
        force: true,
        bypassBlock: true,
      });
    }
    lastVisibilityState = document.visibilityState;
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "VI_ACTIVE_VIDEO_CHANGED") {
      return;
    }
    const nextVideoId = String(message?.videoId || "").trim();
    if (nextVideoId === state.videoId) {
      return;
    }
    const source = String(message?.source || "runtime").trim() || "runtime";
    scheduleAutoRefresh(`runtime_${source}`, nextVideoId, {
      mode: "auto",
    });
  });
}

function handleDebugUnlockTap() {
  const now = Date.now();
  const kept = state.debugTapTimestamps.filter(
    (timestamp) => now - timestamp <= DEBUG_PANEL_UNLOCK_WINDOW_MS
  );
  kept.push(now);
  state.debugTapTimestamps = kept;
  if (
    !state.debugPanelVisible &&
    state.debugTapTimestamps.length >= DEBUG_PANEL_UNLOCK_TAP_COUNT
  ) {
    state.debugPanelVisible = true;
    state.debugTapTimestamps = [];
    renderDebugPanel();
  }
}

async function hydrateDebugPanelVisibilityFromIconTaps() {
  try {
    const now = Date.now();
    const stored = await getStorage([DEBUG_UNLOCK_TAP_STORAGE_KEY]);
    const rawList = Array.isArray(stored?.[DEBUG_UNLOCK_TAP_STORAGE_KEY])
      ? stored[DEBUG_UNLOCK_TAP_STORAGE_KEY]
      : [];
    const kept = rawList
      .map((value) => Number(value))
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value > 0 &&
          now - value <= DEBUG_PANEL_UNLOCK_WINDOW_MS
      );
    kept.push(now);
    if (kept.length >= DEBUG_PANEL_UNLOCK_TAP_COUNT) {
      state.debugPanelVisible = true;
      await setStorage({ [DEBUG_UNLOCK_TAP_STORAGE_KEY]: [] });
      return;
    }
    await setStorage({ [DEBUG_UNLOCK_TAP_STORAGE_KEY]: kept.slice(-24) });
  } catch {
    // Ignore storage failures and keep panel hidden by default.
  }
}

function startActiveVideoWatchers() {
  if (activeVideoPollTimer) return;
  activeVideoPollTimer = setInterval(() => {
    void pollActiveVideoChange();
  }, ACTIVE_VIDEO_POLL_MS);
  void pollActiveVideoChange();
}

function scheduleAutoRefresh(reason, expectedVideoId = "", options = {}) {
  const mode = options?.mode === "open" ? "open" : "auto";
  const force = Boolean(options?.force);
  const bypassBlock = Boolean(options?.bypassBlock);
  const normalizedVideoId = String(expectedVideoId || "").trim();
  if (!force && normalizedVideoId === state.videoId) {
    return;
  }
  if (
    !bypassBlock &&
    state.autoBlockedVideoId &&
    normalizedVideoId &&
    normalizedVideoId === state.autoBlockedVideoId
  ) {
    return;
  }

  pendingAutoRefresh = {
    reason: String(reason || "auto").trim() || "auto",
    expectedVideoId: normalizedVideoId,
    mode,
    force,
    bypassBlock,
  };

  if (autoRefreshTimer) {
    clearTimeout(autoRefreshTimer);
  }
  autoRefreshTimer = setTimeout(() => {
    autoRefreshTimer = null;
    const task = pendingAutoRefresh;
    pendingAutoRefresh = {
      reason: "",
      expectedVideoId: "",
      mode: "auto",
      force: false,
      bypassBlock: false,
    };
    void runAutoRefresh(task);
  }, AUTO_REFRESH_DEBOUNCE_MS);
}

async function runAutoRefresh(task) {
  if (!task) return;
  if (state.actionBusy) return;
  if (refreshPromise) return;
  if (!task.force && task.expectedVideoId === state.videoId) {
    return;
  }
  if (
    !task.bypassBlock &&
    state.autoBlockedVideoId &&
    ((task.expectedVideoId &&
      task.expectedVideoId === state.autoBlockedVideoId) ||
      (!task.expectedVideoId && state.videoId === state.autoBlockedVideoId))
  ) {
    return;
  }
  await refreshTranscript(true, {
    mode: task.mode === "open" ? "open" : "auto",
    reason: task.reason || "auto",
    bypassBlock: task.bypassBlock,
  });
}

async function pollActiveVideoChange() {
  if (state.actionBusy || refreshPromise) return;
  try {
    const tabInfo = await getActiveYoutubeTabInfo();
    const activeVideoId = String(tabInfo?.videoId || "").trim();
    if (
      state.autoBlockedVideoId &&
      activeVideoId &&
      activeVideoId !== state.autoBlockedVideoId
    ) {
      state.autoBlockedVideoId = "";
    }
    if (activeVideoId === state.videoId) return;
    scheduleAutoRefresh("poll_video_change", activeVideoId, {
      mode: "auto",
    });
  } catch (error) {
    const message = String(error?.message || error || "").toLowerCase();
    if (
      message.includes("please open a youtube video tab") ||
      message.includes("no active tab")
    ) {
      // Ignore non-YouTube pages for auto-refresh polling.
    }
  }
}

function createVoiceInsightEngineRuntimeState() {
  const runtime = {};
  VOICEINSIGHT_ENGINE_ORDER.forEach((engine) => {
    runtime[engine] = {
      blockedUntil: 0,
      failureCount: 0,
      lastError: "",
      lastTriedAt: 0,
      lastSuccessAt: 0,
      lastElapsedMs: 0,
    };
  });
  return runtime;
}

function normalizeVoiceInsightEngineName(raw) {
  const text = String(raw || "").trim().toLowerCase();
  if (text === "youtube-transcript-api" || text === "python") {
    return "youtube-transcript-api";
  }
  if (text === "yt-dlp" || text === "ytdlp") {
    return "yt-dlp";
  }
  return "";
}

function getVoiceInsightEngineState(engine) {
  const key = normalizeVoiceInsightEngineName(engine);
  if (!key) return null;
  if (!state.voiceInsightEngines || typeof state.voiceInsightEngines !== "object") {
    state.voiceInsightEngines = createVoiceInsightEngineRuntimeState();
  }
  if (!state.voiceInsightEngines[key]) {
    state.voiceInsightEngines[key] = {
      blockedUntil: 0,
      failureCount: 0,
      lastError: "",
      lastTriedAt: 0,
      lastSuccessAt: 0,
      lastElapsedMs: 0,
    };
  }
  return state.voiceInsightEngines[key];
}

function pickVoiceInsightEnginesForRequest(now = Date.now()) {
  const candidates = VOICEINSIGHT_ENGINE_ORDER.map((engine) => {
    const item = getVoiceInsightEngineState(engine) || {};
    const blockedUntil = Number(item.blockedUntil || 0);
    return {
      engine,
      blockedUntil,
      failureCount: Number(item.failureCount || 0),
      blockedMs: Math.max(0, blockedUntil - now),
    };
  });
  const ready = candidates.filter((item) => item.blockedMs <= 0);
  const blocked = candidates
    .filter((item) => item.blockedMs > 0)
    .map((item) => ({
      engine: item.engine,
      blockedMs: item.blockedMs,
      failureCount: item.failureCount,
    }));

  if (ready.length > 0) {
    return {
      engines: ready.map((item) => item.engine),
      cooldownBypassed: false,
      blocked,
    };
  }

  const sortedBlocked = candidates
    .slice()
    .sort((a, b) => a.blockedMs - b.blockedMs || a.engine.localeCompare(b.engine));
  const first = sortedBlocked[0];
  return {
    engines: first ? [first.engine] : VOICEINSIGHT_ENGINE_ORDER.slice(),
    cooldownBypassed: true,
    blocked,
  };
}

function normalizeVoiceInsightEngineAttempts(rawAttempts) {
  if (!Array.isArray(rawAttempts)) return [];
  return rawAttempts
    .map((item) => {
      const engine = normalizeVoiceInsightEngineName(item?.engine);
      if (!engine) return null;
      const ok = Boolean(item?.ok);
      const code = normalizeLineText(item?.code || (ok ? "ok" : ""));
      const status = Number(item?.status);
      const elapsedMs = Number(item?.elapsedMs);
      return {
        engine,
        ok,
        code,
        status: Number.isFinite(status) ? status : null,
        elapsedMs: Number.isFinite(elapsedMs) ? Math.max(0, Math.round(elapsedMs)) : null,
      };
    })
    .filter(Boolean);
}

function classifyVoiceInsightEngineError(errorCode) {
  const code = String(errorCode || "").trim().toLowerCase();
  if (!code) return "generic";
  if (
    code.includes("request_blocked") ||
    code.includes("ip_blocked") ||
    code.includes("youtube_request_failed") ||
    code.includes("login_required")
  ) {
    return "blocked";
  }
  if (code.includes("bridge_timeout") || code.includes("timeout")) {
    return "timeout";
  }
  if (code.includes("proxy_failed")) {
    return "proxy";
  }
  return "generic";
}

function computeVoiceInsightEngineBackoffMs(engine, errorCode, failureCount) {
  const key = normalizeVoiceInsightEngineName(engine);
  if (!key) return 25_000;
  const baseConfig = VOICEINSIGHT_ENGINE_BACKOFF_BASE_MS[key];
  const type = classifyVoiceInsightEngineError(errorCode);
  const baseMs = Number(baseConfig?.[type] || baseConfig?.generic || 25_000);
  const level = Math.max(0, Number(failureCount || 0) - 1);
  const scaled = Math.min(
    VOICEINSIGHT_ENGINE_BACKOFF_MAX_MS,
    Math.round(baseMs * Math.pow(2, Math.min(level, 4)))
  );
  return Math.max(8_000, scaled);
}

function markVoiceInsightEngineSuccess(engine, extra = {}) {
  const key = normalizeVoiceInsightEngineName(engine);
  if (!key) return;
  const target = getVoiceInsightEngineState(key);
  if (!target) return;
  target.blockedUntil = 0;
  target.failureCount = 0;
  target.lastError = "";
  target.lastTriedAt = Date.now();
  target.lastSuccessAt = Date.now();
  if (Number.isFinite(extra?.elapsedMs)) {
    target.lastElapsedMs = Math.max(0, Math.round(Number(extra.elapsedMs)));
  }
}

function markVoiceInsightEngineFailure(engine, errorCode, extra = {}) {
  const key = normalizeVoiceInsightEngineName(engine);
  if (!key) return;
  const target = getVoiceInsightEngineState(key);
  if (!target) return;
  const now = Date.now();
  target.failureCount = Math.max(1, Number(target.failureCount || 0) + 1);
  target.lastError = normalizeLineText(errorCode || "unknown_error").toLowerCase();
  target.lastTriedAt = now;
  if (Number.isFinite(extra?.elapsedMs)) {
    target.lastElapsedMs = Math.max(0, Math.round(Number(extra.elapsedMs)));
  }
  const backoffMs = computeVoiceInsightEngineBackoffMs(
    key,
    target.lastError,
    target.failureCount
  );
  target.blockedUntil = Math.max(Number(target.blockedUntil || 0), now + backoffMs);
}

function applyVoiceInsightEngineAttemptResults(attempts, requestedEngines, fallbackErrorCode = "") {
  const normalizedAttempts = normalizeVoiceInsightEngineAttempts(attempts);
  if (normalizedAttempts.length > 0) {
    normalizedAttempts.forEach((item) => {
      if (item.ok) {
        markVoiceInsightEngineSuccess(item.engine, { elapsedMs: item.elapsedMs });
      } else {
        markVoiceInsightEngineFailure(item.engine, item.code, { elapsedMs: item.elapsedMs });
      }
    });
    return normalizedAttempts;
  }

  const order = Array.isArray(requestedEngines) ? requestedEngines : [];
  const fallbackEngine = normalizeVoiceInsightEngineName(order[0] || "");
  if (fallbackEngine) {
    markVoiceInsightEngineFailure(fallbackEngine, fallbackErrorCode || "unknown_failure");
  }
  return [];
}

function getChromeCookiesByDetails(details) {
  return new Promise((resolve, reject) => {
    if (!chrome?.cookies?.getAll) {
      resolve([]);
      return;
    }
    chrome.cookies.getAll(details, (items) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "cookies_get_failed"));
        return;
      }
      resolve(Array.isArray(items) ? items : []);
    });
  });
}

function sanitizeCookiePair(name, value) {
  const key = String(name || "").trim();
  if (!key || !/^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/.test(key)) {
    return "";
  }
  const safeValue = String(value || "")
    .replace(/[\r\n]/g, "")
    .replace(/;/g, "")
    .trim();
  if (!safeValue) return "";
  return `${key}=${safeValue}`;
}

async function collectYoutubeCookieHeaderForVoiceInsight() {
  const allowOrder = YOUTUBE_COOKIE_BRIDGE_ALLOWLIST.slice();
  const allowSet = new Set(allowOrder.map((name) => name.toLowerCase()));
  const collected = [];
  const seenNames = new Set();

  const pushCookies = (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    items.forEach((item) => {
      const name = String(item?.name || "").trim();
      const value = String(item?.value || "");
      if (!name || !value) return;
      const lower = name.toLowerCase();
      if (!allowSet.has(lower)) return;
      if (seenNames.has(lower)) return;
      const pair = sanitizeCookiePair(name, value);
      if (!pair) return;
      seenNames.add(lower);
      collected.push({ name, pair });
    });
  };

  const tryDetails = [
    { url: "https://www.youtube.com/" },
    { domain: ".youtube.com" },
  ];
  for (let index = 0; index < tryDetails.length; index += 1) {
    try {
      const items = await getChromeCookiesByDetails(tryDetails[index]);
      pushCookies(items);
      if (collected.length >= allowOrder.length) {
        break;
      }
    } catch {
      // Ignore single cookie source failure and continue.
    }
  }

  if (collected.length === 0) {
    return {
      header: "",
      count: 0,
      bytes: 0,
    };
  }

  const ordered = [];
  allowOrder.forEach((name) => {
    const match = collected.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (!match) return;
    ordered.push(match.pair);
  });

  let header = "";
  for (let index = 0; index < ordered.length; index += 1) {
    const candidate = header ? `${header}; ${ordered[index]}` : ordered[index];
    if (candidate.length > YOUTUBE_COOKIE_BRIDGE_MAX_HEADER_BYTES) {
      break;
    }
    header = candidate;
  }
  return {
    header,
    count: header ? header.split("; ").length : 0,
    bytes: header.length,
  };
}

function shouldRetryVoiceInsightWithCookieBridge(errorCode, attempts, requestedEngines) {
  const engines = Array.isArray(requestedEngines) ? requestedEngines : [];
  const hasYtDlp = engines.some(
    (engine) => normalizeVoiceInsightEngineName(engine) === "yt-dlp"
  );
  if (!hasYtDlp) {
    return { allow: false, reason: "yt_dlp_not_requested" };
  }

  const text = String(errorCode || "").trim().toLowerCase();
  if (text.includes("login_required")) {
    return { allow: true, reason: "login_required" };
  }
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return { allow: false, reason: text || "no_engine_attempts" };
  }
  const matched = attempts.find((item) => {
    const engine = normalizeVoiceInsightEngineName(item?.engine);
    const code = String(item?.code || "").trim().toLowerCase();
    return engine === "yt-dlp" && code.includes("login_required");
  });
  if (matched) {
    return {
      allow: true,
      reason: `yt_dlp_${String(matched?.code || "login_required")
        .trim()
        .toLowerCase()}`,
    };
  }
  return { allow: false, reason: text || "yt_dlp_login_not_required" };
}

async function initLocale() {
  const stored = await getStorage([LOCALE_STORAGE_KEY]);
  const override = stored?.[LOCALE_STORAGE_KEY];
  if (override === "zh" || override === "en") {
    state.locale = override;
  }
}

function detectLocale() {
  const raw =
    (Array.isArray(navigator.languages) && navigator.languages[0]) ||
    navigator.language ||
    "en";
  return raw.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function t(key, params) {
  const dict = I18N[state.locale] || I18N.en;
  const fallback = I18N.en;
  let template = dict[key] || fallback[key] || key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => {
    const value = params[token];
    return value === undefined || value === null ? "" : String(value);
  });
}

function setLocale(locale) {
  if (locale !== "zh" && locale !== "en") return;
  if (locale === state.locale) return;
  state.locale = locale;
  void setStorage({ [LOCALE_STORAGE_KEY]: locale });
  applyI18n();
  render();
}

function applyI18n() {
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";
  document.title = t("app_title");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    node.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    const key = node.getAttribute("data-i18n-aria");
    if (!key) return;
    node.setAttribute("aria-label", t(key));
  });

  if (formatSelectEl) {
    formatSelectEl.value = state.format;
  }
}

function render() {
  renderLangToggle();
  renderStatus();
  renderDebugPanel();
  renderTranscriptLanguage();
  renderActionAvailability();
  renderLineList();
}

function renderLangToggle() {
  const isZh = state.locale === "zh";
  langZhBtn?.classList.toggle("active", isZh);
  langEnBtn?.classList.toggle("active", !isZh);
  langZhBtn?.setAttribute("aria-pressed", String(isZh));
  langEnBtn?.setAttribute("aria-pressed", String(!isZh));
}

function renderStatus() {
  if (!statusToastEl) return;
  const override = state.statusOverride;
  if (!override || !override.key) {
    statusToastEl.textContent = "";
    statusToastEl.className = "status-toast is-hidden";
    return;
  }
  const text = normalizeLineText(t(override.key, override.params));
  if (!text) {
    statusToastEl.textContent = "";
    statusToastEl.className = "status-toast is-hidden";
    return;
  }
  const level = normalizeLineText(override.className).toLowerCase();
  const supportedLevel = ["success", "error", "loading", "info"].includes(level)
    ? level
    : "info";
  statusToastEl.textContent = text;
  statusToastEl.className = `status-toast ${supportedLevel}`;
}

function renderDebugPanel() {
  if (debugWrapEl) {
    debugWrapEl.classList.toggle("is-hidden", !state.debugPanelVisible);
  }
  if (!state.debugPanelVisible) {
    return;
  }
  if (copyDiagBtnEl) {
    copyDiagBtnEl.disabled = !state.diagnosticsText;
  }
  renderBusinessLogs();
}

function renderBusinessLogs() {
  if (!debugBizListEl) return;
  const logs = Array.isArray(state.businessLogs) ? state.businessLogs : [];
  const shouldStickBottom =
    debugBizListEl.scrollTop + debugBizListEl.clientHeight >=
    debugBizListEl.scrollHeight - 12;
  debugBizListEl.innerHTML = "";

  if (logs.length === 0) {
    const empty = document.createElement("div");
    empty.className = "debug-biz-empty";
    empty.textContent = t("debug_process_empty");
    debugBizListEl.appendChild(empty);
    return;
  }

  logs.slice(-140).forEach((entry) => {
    const row = document.createElement("article");
    row.className = `debug-biz-row ${entry.level || "info"}`;

    const time = document.createElement("span");
    time.className = "debug-biz-time";
    time.textContent = formatBusinessLogTime(entry.at);

    const line = document.createElement("div");
    line.className = "debug-biz-line";

    const text = document.createElement("div");
    text.className = "debug-biz-text";
    text.textContent =
      entry.count > 1 ? `${entry.message}（重复 ${entry.count} 次）` : entry.message;

    line.appendChild(time);
    line.appendChild(text);
    row.appendChild(line);
    debugBizListEl.appendChild(row);
  });

  if (shouldStickBottom) {
    debugBizListEl.scrollTop = debugBizListEl.scrollHeight;
  }
}

function formatBusinessLogTime(isoString) {
  try {
    const date = new Date(String(isoString || ""));
    if (!Number.isFinite(date.getTime())) return "--:--:--";
    return date.toLocaleTimeString(state.locale === "zh" ? "zh-CN" : "en", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

function renderTranscriptLanguage() {
  if (!transcriptLangEl) return;
  const label = resolveTranscriptLanguageLabel();
  transcriptLangEl.textContent = t("transcript_language", {
    language: label,
  });
}

function resolveTranscriptLanguageLabel() {
  const fallback = t("transcript_language_unknown");
  const languageName = normalizeLineText(state.transcriptLanguageName);
  const languageCode = normalizeLanguageCodeValue(state.transcriptLanguageCode);
  let resolved = "";

  // Prefer canonical language code for locale-aware display text.
  if (languageCode) {
    resolved = getLanguageDisplayName(languageCode);
  }

  if (!resolved && languageName) {
    const inferredCode = matchLanguageCodeByName(languageName);
    if (inferredCode) {
      resolved = getLanguageDisplayName(inferredCode);
    } else if (/^[a-z]{2,3}(?:-[a-z0-9]+)?$/i.test(languageName)) {
      const fromNameCode = normalizeLanguageCodeValue(languageName);
      if (fromNameCode) {
        resolved = getLanguageDisplayName(fromNameCode);
      }
    } else {
      resolved = languageName;
    }
  }

  if (!resolved) {
    resolved = fallback;
  }
  return resolved;
}

function getLanguageDisplayName(languageCode) {
  const code = normalizeLanguageCodeValue(languageCode);
  if (!code) return "";
  try {
    const localeTag = state.locale === "zh" ? "zh-CN" : "en";
    const displayNames = new Intl.DisplayNames([localeTag], {
      type: "language",
    });
    return (
      displayNames.of(code) ||
      displayNames.of(code.split("-")[0] || code) ||
      code
    );
  } catch {
    return code;
  }
}

function renderActionAvailability() {
  const ready = state.status === "success" && getExportLines().length > 0;
  const disabled = !ready || state.actionBusy;
  if (downloadBtnEl) downloadBtnEl.disabled = disabled;
  if (copyBtnEl) copyBtnEl.disabled = disabled;
  if (formatSelectEl) {
    formatSelectEl.disabled = disabled;
    formatSelectEl.value = normalizeExportFormat(state.format);
  }
  if (timeToggleBtnEl) {
    timeToggleBtnEl.disabled = disabled;
    timeToggleBtnEl.classList.toggle("active", state.timeModeEnabled);
    timeToggleBtnEl.setAttribute("aria-pressed", String(state.timeModeEnabled));
  }
  if (refreshBtnEl) refreshBtnEl.disabled = state.actionBusy || state.status === "loading";
}

function getExportLines() {
  const displayLines = getDisplayLines();
  if (Array.isArray(displayLines) && displayLines.length > 0) {
    return displayLines;
  }
  if (Array.isArray(state.rawLines) && state.rawLines.length > 0) {
    return state.rawLines;
  }
  return [];
}

function getDisplayLines() {
  const baseLines = Array.isArray(state.lines) ? state.lines : [];
  if (!shouldGroupLinesByDisplayTimestamp(baseLines)) {
    return baseLines;
  }
  return groupLinesByDisplayTimestamp(baseLines);
}

function renderLineList() {
  if (!lineListEl) return;
  const isStateMode = state.status !== "success";
  lineListEl.classList.toggle("is-loading", state.status === "loading");
  lineListEl.classList.toggle("is-state", isStateMode);
  lineListEl.innerHTML = "";

  if (state.status === "loading") {
    const loading = document.createElement("section");
    loading.className = "line-list-state";

    const loadingText = document.createElement("div");
    loadingText.className = "line-list-state-text";
    const loadingDetailText = normalizeLineText(t("status_loading"));
    const loadingTitleText = normalizeLineText(t("loading_card"));
    loadingText.textContent = loadingDetailText || loadingTitleText;
    loading.appendChild(loadingText);
    lineListEl.appendChild(loading);
    return;
  }

  if (state.status !== "success") {
    const empty = document.createElement("section");
    empty.className = "line-list-state";

    const text = document.createElement("div");
    text.className = "line-list-state-text";
    const statusText = normalizeLineText(t(state.statusKey, state.statusParams));
    const emptyTitleText = normalizeLineText(t("empty_error_title"));
    const fallbackText = normalizeLineText(t("empty_error_text"));
    text.textContent = statusText || fallbackText || emptyTitleText;
    empty.appendChild(text);
    lineListEl.appendChild(empty);
    return;
  }

  const displayLines = getDisplayLines();
  if (state.activeIndex >= displayLines.length) {
    state.activeIndex = 0;
  }

  displayLines.forEach((line, index) => {
    const item = document.createElement("article");
    item.className = "line";
    if (!state.timeModeEnabled) {
      item.classList.add("no-time");
    }
    item.setAttribute("data-index", String(index));
    if (index === state.activeIndex) {
      item.classList.add("active");
    }

    const content = document.createElement("div");
    content.className = "line-text";
    content.textContent = line.text;

    if (state.timeModeEnabled) {
      const time = document.createElement("div");
      time.className = "line-time";
      time.textContent =
        normalizeTimestamp(line.displayTimestamp || line.timestamp) ||
        formatClock(getLineSeconds(line, index));
      item.appendChild(time);
    }
    item.appendChild(content);
    lineListEl.appendChild(item);
  });
}

function shouldGroupLinesByDisplayTimestamp(lines) {
  if (!Array.isArray(lines) || lines.length < 2) return false;
  const source = normalizeLineText(state.transcriptSource).toLowerCase();
  if (!source.includes("yt_timedtext")) {
    return false;
  }
  for (let index = 1; index < lines.length; index += 1) {
    const prev = normalizeTimestamp(
      lines[index - 1]?.displayTimestamp || lines[index - 1]?.timestamp
    );
    const current = normalizeTimestamp(
      lines[index]?.displayTimestamp || lines[index]?.timestamp
    );
    if (prev && current && prev === current) {
      return true;
    }
  }
  return false;
}

function groupLinesByDisplayTimestamp(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return [];
  const grouped = [];

  lines.forEach((line, index) => {
    const text = normalizeLineText(line?.text);
    if (!text) return;
    const seconds = getLineSeconds(line, index);
    const timestamp =
      normalizeTimestamp(line?.displayTimestamp || line?.timestamp) ||
      formatClock(seconds);

    const previous = grouped[grouped.length - 1] || null;
    if (previous && normalizeTimestamp(previous.displayTimestamp || previous.timestamp) === timestamp) {
      previous.text = joinSegmentText(previous.text, text);
      return;
    }

    grouped.push({
      ...line,
      timestamp,
      displayTimestamp: timestamp,
      seconds: Number.isFinite(seconds) ? seconds : Number(line?.seconds),
      start: Number.isFinite(line?.start)
        ? Number(line.start)
        : Number.isFinite(seconds)
        ? seconds
        : null,
      startMs: Number.isFinite(line?.startMs)
        ? Number(line.startMs)
        : Number.isFinite(seconds)
        ? Math.round(seconds * 1000)
        : null,
      text,
    });
  });

  return grouped;
}

function setPanelStatus(status, key, className, params = null) {
  state.status = status;
  state.statusKey = key;
  state.statusClass = className;
  state.statusParams = params;
}

function setStatusOverride(key, className, params = null, durationMs = 1800) {
  clearTimeout(overrideTimer);
  state.statusOverride = { key, className, params };
  renderStatus();
  overrideTimer = setTimeout(() => {
    state.statusOverride = null;
    renderStatus();
  }, durationMs);
}

function clearStatusOverride() {
  clearTimeout(overrideTimer);
  state.statusOverride = null;
}

function startDiagnosticsRun() {
  state.debugCode = t("debug_code_none");
  state.diagnosticsText = "";
  state.businessLogs = [];
  state.diagnosticsRun = {
    build: DEBUG_BUILD_LABEL,
    startedAt: new Date().toISOString(),
    locale: state.locale,
    userAgent: navigator.userAgent,
    steps: [],
  };
  addDiagStep("FLOW_INIT", "ok", { locale: state.locale });
}

function addDiagStep(stage, status, detail = {}) {
  if (!state.diagnosticsRun) return;
  const sanitizedDetail = sanitizeDiagnosticsDetail(detail);
  state.diagnosticsRun.steps.push({
    at: new Date().toISOString(),
    stage,
    status,
    detail: sanitizedDetail,
  });
  appendBusinessLogFromStep(stage, status, sanitizedDetail);
}

function appendBusinessLogFromStep(stage, status, detail = {}) {
  const messages = buildBusinessLogMessages(stage, status, detail);
  if (!Array.isArray(messages) || messages.length === 0) return;
  messages.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const text = normalizeLineText(item.message);
    if (!text) return;
    const level = normalizeLineText(item.level || "").toLowerCase() || "info";
    const nowIso = new Date().toISOString();
    const previous = state.businessLogs[state.businessLogs.length - 1];
    if (previous && previous.message === text && previous.level === level) {
      previous.count = Number(previous.count || 1) + 1;
      previous.at = nowIso;
    } else {
      state.businessLogs.push({
        at: nowIso,
        stage,
        status,
        level,
        message: text,
        count: 1,
      });
      if (state.businessLogs.length > 220) {
        state.businessLogs = state.businessLogs.slice(-220);
      }
    }
  });
  if (state.debugPanelVisible) {
    renderDebugPanel();
  }
}

function resolveChannelIdFromRaw(raw) {
  const value = normalizeLineText(raw).toUpperCase();
  if (!value) return "";
  if (value === TRANSCRIPT_STRATEGY_FULL_CHAIN) return "";
  if (value === TRANSCRIPT_STRATEGY_TIMEDTEXT_THEN_PANEL) return "";
  if (value === CHANNEL_YT_PANEL_TRANSCRIPT) return CHANNEL_YT_PANEL_TRANSCRIPT;
  if (value === CHANNEL_YT_CAPTION_TRACK) return CHANNEL_YT_CAPTION_TRACK;
  if (value === CHANNEL_YT_TIMEDTEXT) return CHANNEL_YT_TIMEDTEXT;
  if (value === CHANNEL_YT_INNERTUBE) return CHANNEL_YT_INNERTUBE;
  if (value === CHANNEL_VI_API) return CHANNEL_VI_API;
  if (value === CHANNEL_VI_AGENT) return CHANNEL_VI_AGENT;
  if (value.includes("PRIMARY_CAPTURE") || value.includes("PAGE_CAPTURE")) {
    return CHANNEL_YT_PANEL_TRANSCRIPT;
  }
  if (
    value.includes("CAPTION_TRACK") ||
    value.includes("PRIMARY_TRACK") ||
    value.includes("CAPTION_META") ||
    value.includes("GET_CAPTIONS_META")
  ) {
    return CHANNEL_YT_CAPTION_TRACK;
  }
  if (value.includes("TIMEDTEXT") || value === "FETCH_PAGE" || value === "FETCH_WORKER") {
    return CHANNEL_YT_TIMEDTEXT;
  }
  if (value.includes("INNERTUBE") || value.includes("GET_TRANSCRIPT")) {
    return CHANNEL_YT_INNERTUBE;
  }
  if (value.includes("VOICEINSIGHT_AGENT")) {
    return CHANNEL_VI_AGENT;
  }
  if (
    value.includes("VOICEINSIGHT_API") ||
    value.includes("VOICEINSIGHT_META") ||
    value.includes("COOKIE_BRIDGE")
  ) {
    return CHANNEL_VI_API;
  }
  return "";
}

function resolveChannelIdForStep(stage, detail = {}) {
  const byPath = resolveChannelIdFromRaw(detail?.path || "");
  if (byPath) return byPath;
  const byStage = resolveChannelIdFromRaw(stage);
  if (byStage) return byStage;
  const byStrategy = resolveChannelIdFromRaw(detail?.strategy || "");
  if (byStrategy) return byStrategy;
  return "";
}

function getChannelLabel(channelId) {
  return CHANNEL_LABELS[channelId] || channelId || "未知通道";
}

function isGlobalStepStage(stage) {
  return [
    "FLOW_INIT",
    "ACTIVE_TAB",
    "CONTEXT_GATE",
    "CONTEXT_GATE_RETRY",
    "FALLBACK_CHAIN",
    "NORMALIZE_TIMELINE",
    "TIMESTAMP_ALIGN",
    "FLOW_DONE",
  ].includes(String(stage || ""));
}

function buildUniversalBusinessLogMessages(stage, status, detail, options = {}) {
  const messages = [];
  const push = (message, level = "info") => {
    const text = normalizeLineText(message);
    if (!text) return;
    messages.push({ message: text, level });
  };
  const describeError =
    typeof options?.describeError === "function"
      ? options.describeError
      : (raw) => normalizeLineText(raw || "原因暂未识别");
  const errorText = normalizeLineText(options?.errorText || "");
  const attempt = Number.isFinite(Number(options?.attempt))
    ? Number(options.attempt)
    : null;

  if (stage === "FALLBACK_CHAIN") {
    if (status === "start") {
      const strategyRaw = normalizeLineText(detail?.strategy || "");
      if (strategyRaw === TRANSCRIPT_STRATEGY_FULL_CHAIN) {
        push(
          `开始执行提取链路：${CHANNEL_VI_API} -> ${CHANNEL_YT_CAPTION_TRACK} -> ${CHANNEL_YT_TIMEDTEXT} -> ${CHANNEL_YT_PANEL_TRANSCRIPT}。`,
          "info"
        );
        return messages;
      }
      if (strategyRaw === TRANSCRIPT_STRATEGY_TIMEDTEXT_THEN_PANEL) {
        push(
          `开始执行提取链路：${CHANNEL_YT_TIMEDTEXT} -> ${CHANNEL_YT_PANEL_TRANSCRIPT}。`,
          "info"
        );
        return messages;
      }
      const strategyChannel = resolveChannelIdFromRaw(detail?.strategy || "");
      if (strategyChannel) {
        push(
          `开始执行提取链路：${strategyChannel}（${getChannelLabel(strategyChannel)}）。`,
          "info"
        );
      }
      return messages;
    }
    const pathChannel = resolveChannelIdFromRaw(detail?.path || "");
    if (!pathChannel) return messages;
    const nextChannel = resolveChannelIdFromRaw(detail?.nextStep || "");
    const sourceText = normalizeLineText(detail?.source || detail?.engine || "");
    const lines = Number(detail?.lines || detail?.timelineSize || 0);
    if (status === "ok") {
      push(
        `${pathChannel} 成功${lines > 0 ? `，共 ${lines} 条字幕` : ""}${
          sourceText ? `（来源：${sourceText}）` : ""
        }。`,
        "success"
      );
    } else if (status === "retry") {
      const phase = normalizeLineText(detail?.phase || "").toUpperCase();
      if (pathChannel === CHANNEL_YT_PANEL_TRANSCRIPT && phase === "COMPAT_OPEN") {
        push(
          `${pathChannel} 严格无感阶段未成功，将切换到兼容阶段（允许打开 Transcript 面板）重试。原因：${describeError(
            errorText
          )}。`,
          "warn"
        );
        return messages;
      }
      if (normalizeLineText(detail?.nextStep || "").toLowerCase() === "none") {
        push(`${pathChannel} 未成功（当前无后续通道）。原因：${describeError(errorText)}。`, "warn");
      } else if (nextChannel) {
        push(
          `${pathChannel} 未成功，将继续尝试 ${nextChannel}。原因：${describeError(errorText)}。`,
          "warn"
        );
      } else {
        push(`${pathChannel} 未成功，继续下一步。原因：${describeError(errorText)}。`, "warn");
      }
    } else if (status === "error") {
      push(`${pathChannel} 失败：${describeError(errorText)}。`, "error");
    }
    return messages;
  }

  const channelId = resolveChannelIdForStep(stage, detail);
  if (!channelId || isGlobalStepStage(stage)) {
    return messages;
  }

  const sourceText = normalizeLineText(detail?.source || detail?.engine || "");
  const lines = Number(detail?.lines || detail?.timelineSize || 0);
  if (status === "start") {
    push(
      `${channelId} 开始执行${attempt ? `（第 ${attempt} 次）` : ""}。`,
      "info"
    );
  } else if (status === "ok") {
    push(
      `${channelId} 执行成功${lines > 0 ? `，共 ${lines} 条字幕` : ""}${
        sourceText ? `（来源：${sourceText}）` : ""
      }。`,
      "success"
    );
  } else if (status === "retry") {
    push(`${channelId} 需重试：${describeError(errorText)}。`, "warn");
  } else if (status === "error") {
    push(`${channelId} 执行失败：${describeError(errorText)}。`, "error");
  }
  return messages;
}

function buildBusinessLogMessages(stage, status, detail = {}) {
  const messages = [];
  const path = normalizeLineText(detail?.path).toUpperCase();
  const errorText = normalizeLineText(
    detail?.error || detail?.responseError || detail?.normalizedError || ""
  );
  const attempt = Number.isFinite(Number(detail?.attempt))
    ? Number(detail.attempt)
    : null;
  const push = (message, level = "info") => {
    if (!message) return;
    messages.push({ message, level });
  };
  const describeError = (rawError) => {
    const text = normalizeLineText(rawError).toLowerCase();
    if (!text) return "原因暂未识别";
    if (text.includes("capture_entry_not_effective")) {
      return "已点击字幕入口，但页面未进入可提取状态";
    }
    if (text.includes("capture_http_400")) {
      return "页面字幕接口校验未通过";
    }
    if (text.includes("capture_http_")) {
      return "页面字幕接口返回异常状态";
    }
    if (text.includes("capture_request_not_observed")) {
      return "未观察到页面自身的字幕请求响应";
    }
    if (text.includes("capture_schema_unmatched")) {
      return "页面数据结构中未匹配到可用字幕";
    }
    if (text.includes("capture_entry_not_found")) {
      return "未找到“显示字幕”入口";
    }
    if (text.includes("capture_empty_body")) {
      return "监听到了响应，但返回内容为空";
    }
    if (text.includes("timedtext_html_empty")) {
      return "timedtext 返回空响应，无法直接拿到字幕";
    }
    if (text.includes("skip_due_timedtext_html_empty")) {
      return "检测到 timedtext 空响应，已直接切换到 PAGE_CAPTURE";
    }
    if (text.includes("no_caption_tracks")) {
      return "未读取到任何字幕轨道";
    }
    if (text.includes("player_response_mismatch")) {
      return "页面播放器仍停留在上一个视频，当前上下文不一致";
    }
    if (text.includes("player_response_not_found")) {
      return "页面播放器模型尚未就绪";
    }
    if (text.includes("context_not_ready")) {
      return "页面尚未稳定";
    }
    if (text.includes("context_mismatch") || text.includes("context_url_mismatch")) {
      return "当前页面视频与目标视频不一致";
    }
    if (text.includes("agent_not_ready")) {
      return "本地 Agent 未就绪";
    }
    if (text.includes("agent_health_failed")) {
      return "本地 Agent 健康检查失败";
    }
    if (text.includes("third_party_request_blocked") || text.includes("request_blocked")) {
      return "VOICEINSIGHT_API 请求被上游限制";
    }
    if (text.includes("third_party_login_required") || text.includes("login_required")) {
      return "VOICEINSIGHT_API 命中登录校验（疑似机器人校验）";
    }
    if (text.includes("cookie_bridge_no_cookies")) {
      return "浏览器会话 Cookie 不可用";
    }
    if (text.includes("cookie_bridge_unavailable")) {
      return "当前环境不支持读取浏览器 Cookie";
    }
    if (text.includes("cookie_bridge_failed")) {
      return "Cookie Bridge 重试未成功";
    }
    if (text.includes("third_party_proxy_failed") || text.includes("proxy_failed")) {
      return "VOICEINSIGHT_API 代理链路异常（yt-dlp 无法连通代理）";
    }
    if (text.includes("third_party_timeout")) {
      return "VOICEINSIGHT_API 请求超时";
    }
    if (text.includes("bridge_timeout_no_output")) {
      return "yt-dlp 在预算时间内无响应（无输出）";
    }
    if (text.includes("bridge_timeout_after_output")) {
      return "yt-dlp 输出未完成即超时（已返回部分输出）";
    }
    if (text.includes("third_party_bridge_timeout") || text.includes("bridge_timeout")) {
      return "VOICEINSIGHT_API 引擎执行超时";
    }
    if (text.includes("third_party_yt_dlp_not_installed")) {
      return "本地 Agent 缺少 yt-dlp";
    }
    if (text.includes("third_party_python_dependency_missing")) {
      return "本地 Agent 缺少 youtube-transcript-api 依赖";
    }
    if (text.includes("third_party_no_transcript_found") || text.includes("captions_not_found")) {
      return "该视频暂未提供可用字幕";
    }
    if (text.includes("third_party_transcripts_disabled")) {
      return "该视频字幕功能被关闭";
    }
    if (text.includes("third_party_video_unavailable")) {
      return "视频不可用，无法提取字幕";
    }
    if (text.includes("innertube_http_")) {
      return "页面内参数方式请求失败";
    }
    return "遇到未识别异常";
  };
  const describeOpenPath = (rawPath) => {
    const key = normalizeLineText(rawPath).toLowerCase();
    if (!key) return "";
    if (key === "direct_clicked") {
      return "已点击“显示字幕”入口";
    }
    if (key === "expand_then_direct") {
      return "已展开描述并点击“显示字幕”入口";
    }
    if (key === "menu_clicked") {
      return "已通过“更多”菜单点击“显示字幕”入口";
    }
    if (key === "tab_clicked") {
      return "已点击 Transcript 标签页入口";
    }
    if (key === "skip_open") {
      return "按策略跳过字幕入口点击";
    }
    if (key === "already_open") {
      return "页面检测到 Transcript 面板已处于打开状态";
    }
    if (key === "already_open_wait") {
      return "页面检测到 Transcript 面板已打开（等待就绪）";
    }
    if (key === "preopen_model") {
      return "页面模型已命中字幕结构（未触发入口点击）";
    }
    if (key === "none") {
      return "未命中可用字幕入口点击路径（未触发入口点击）";
    }
    if (key === "unknown") {
      return "字幕入口状态未知";
    }
    return "字幕入口状态未识别";
  };
  const isTranscriptEntryClickPath = (rawPath) =>
    ["direct_clicked", "expand_then_direct", "menu_clicked", "tab_clicked"].includes(
      normalizeLineText(rawPath).toLowerCase()
    );
  const isTranscriptPanelPreReadyPath = (rawPath) => {
    const key = normalizeLineText(rawPath).toLowerCase();
    return key === "preopen_model" || key === "already_open" || key === "already_open_wait";
  };
  const describeTimestampAlignSource = (rawSource) => {
    const key = normalizeLineText(rawSource).toLowerCase();
    if (!key) return "未知来源";
    if (key === "panel_no_open") return "Transcript 面板锚点（无需打开面板）";
    if (key === "panel_open") return "Transcript 面板锚点（自动打开面板采样）";
    if (key === "heuristic_lines") return "文本分句锚点（无面板锚点时降级）";
    return key;
  };
  const describeTimestampAlignReason = (rawReason) => {
    const key = normalizeLineText(rawReason).toLowerCase();
    if (!key) return "未拿到可用锚点";
    if (key.includes("anchors_insufficient")) return "锚点数量不足";
    if (key.includes("anchors_sparse")) return "锚点过稀，覆盖不够";
    if (key.includes("anchors_low_coverage")) return "锚点覆盖不足";
    if (key.includes("state_outdated")) return "页面已切换，结果作废";
    if (key.includes("align_exception")) return "对齐采样执行异常";
    return "未拿到可用锚点";
  };
  const universalMessages = buildUniversalBusinessLogMessages(stage, status, detail, {
    errorText,
    attempt,
    describeError,
  });
  const appendPrimaryDebugMessages = (debug, statusText = "") => {
    if (!debug || typeof debug !== "object") return;
    const openPathKey = normalizeLineText(debug.openPath).toLowerCase();
    const openPathDesc = describeOpenPath(openPathKey);
    const clickedByExtension =
      typeof debug.openTriggeredByExtension === "boolean"
        ? debug.openTriggeredByExtension
        : isTranscriptEntryClickPath(openPathKey);
    const panelPreReady =
      typeof debug.panelReadyBeforeOpen === "boolean"
        ? debug.panelReadyBeforeOpen
        : isTranscriptPanelPreReadyPath(openPathKey);
    const openAttempted =
      typeof debug.openAttempted === "boolean"
        ? debug.openAttempted
        : clickedByExtension;

    if (openPathDesc) {
      push(`字幕入口状态：${openPathDesc}。`, "info");
    }
    if (clickedByExtension) {
      if (debug.openVerified) {
        push("字幕入口点击后校验通过：页面已进入可提取状态。", "info");
      } else {
        push("字幕入口点击后校验未通过：页面未进入可提取状态。", "warn");
      }
    } else if (panelPreReady) {
      push("未执行字幕入口点击：页面已处于可提取状态。", "info");
    } else if (!openAttempted) {
      push("未执行字幕入口点击：继续使用无感提取路径。", "info");
    }
    const clickedLabel = normalizeLineText(debug.openClickedLabel);
    if (clickedByExtension && clickedLabel) {
      push(`字幕入口命中文案：${clickedLabel}。`, "info");
    }
    const pageRequestCount = Number(debug.pageNativeRequestCount || debug.requestCount || 0);
    const pageResponseCount = Number(debug.pageNativeResponseCount || debug.responseCount || 0);
    if (pageRequestCount > 0 || pageResponseCount > 0) {
      push(
        `监听页面字幕请求：发起 ${pageRequestCount} 次，收到响应 ${pageResponseCount} 次。`,
        "info"
      );
    } else {
      push("监听页面字幕请求：未观察到请求响应。", "warn");
    }
    const selfProbeCount = Number(debug.selfProbeRequestCount || 0);
    if (selfProbeCount > 0) {
      push(`已自动进行 ${selfProbeCount} 次补充参数探测。`, "info");
    }
    const modelProbeCount = Number(debug.modelProbeCount || 0);
    const modelMatchedTimelineCount = Number(debug.modelMatchedTimelineCount || 0);
    if (modelProbeCount > 0) {
      if (modelMatchedTimelineCount > 0) {
        push(`页面模型字幕结构匹配成功：找到 ${modelMatchedTimelineCount} 条字幕。`, "success");
      } else {
        push(
          "页面模型字幕结构探测完成：未匹配到可用字幕。",
          statusText === "ok" ? "info" : "warn"
        );
      }
    }
    if (debug.innertubeProbeTried) {
      const statuses = Array.isArray(debug.innertubeHttpStatuses)
        ? debug.innertubeHttpStatuses.filter((value) => Number.isFinite(Number(value)))
        : [];
      if (statuses.length > 0) {
        push(
          "页面内参数方式探测已执行，但未拿到可用字幕。",
          statuses.some((code) => Number(code) >= 400) ? "warn" : "info"
        );
      } else {
        push("页面内参数方式探测已执行。", "info");
      }
    }
  };

  const stageLabelMap = {
    CAPTION_META: "字幕元数据读取",
    CAPTION_TRACK: "字幕轨道读取",
    PLAYER_TRACKS_TIMEDTEXT: "字幕轨道接口",
    PLAYER_TRACKS_MESSAGE: "字幕轨道消息",
    INNERTUBE_TRANSCRIPT: "页面参数方式",
    INNERTUBE_MESSAGE: "页面参数响应",
    FETCH_PAGE: "页面请求",
    FETCH_WORKER: "后台请求",
  };

  switch (stage) {
    case "FLOW_INIT":
      if (status === "ok") {
        push("开始新的字幕提取流程。", "info");
      }
      break;
    case "ACTIVE_TAB":
      if (status === "ok") {
        const videoId = normalizeLineText(detail?.videoId);
        push(
          `已识别当前视频${videoId ? `（ID: ${videoId}）` : ""}。`,
          "success"
        );
      } else {
        push(`获取当前视频信息失败：${describeError(errorText)}。`, "error");
      }
      break;
    case "CONTEXT_GATE":
    case "CONTEXT_GATE_RETRY":
      if (status === "start") {
        push("正在确认页面上下文与目标视频一致。", "info");
      } else if (status === "ok") {
        push("页面上下文校验通过。", "success");
      } else if (status === "error") {
        push(`页面上下文校验失败：${describeError(errorText)}。`, "error");
      }
      break;
    case "FALLBACK_CHAIN":
      if (status === "start") {
        const strategy = normalizeLineText(detail?.strategy || "");
        if (strategy === CHANNEL_YT_PANEL_TRANSCRIPT) {
          push(
            `开始执行提取链路：${CHANNEL_YT_PANEL_TRANSCRIPT}（${CHANNEL_YT_PANEL_TRANSCRIPT_LABEL}，仅单通道调试）。`,
            "info"
          );
        } else if (strategy === TRANSCRIPT_STRATEGY_TIMEDTEXT_THEN_PANEL) {
          push(
            `开始执行提取链路：${CHANNEL_YT_TIMEDTEXT} -> ${CHANNEL_YT_PANEL_TRANSCRIPT}。`,
            "info"
          );
        } else {
          push(
            "开始执行提取链路：VOICEINSIGHT_API（youtube-transcript-api -> yt-dlp）-> CAPTION_TRACK -> TIMEDTEXT_LIST -> PAGE_CAPTURE。",
            "info"
          );
        }
      } else if (status === "retry") {
        if (path === "VOICEINSIGHT_META") {
          push(`VOICEINSIGHT_API 前置语言轨道读取失败。原因：${describeError(errorText)}。`, "warn");
        } else if (path === "VOICEINSIGHT_API") {
          push(`VOICEINSIGHT_API 未成功，继续尝试 CAPTION_TRACK。原因：${describeError(errorText)}。`, "warn");
        } else if (path === "PRIMARY_TRACK_META") {
          push(`CAPTION_TRACK 前置轨道元数据读取失败。原因：${describeError(errorText)}。`, "warn");
        } else if (path === "PRIMARY_TRACKS") {
          if (detail?.nextStep === "none") {
            push(`CAPTION_TRACK 未成功（当前调试链路已无后续通道）。原因：${describeError(errorText)}。`, "warn");
          } else {
            push(`CAPTION_TRACK 未成功，继续尝试 TIMEDTEXT_LIST。原因：${describeError(errorText)}。`, "warn");
          }
        } else if (path === "PRIMARY_TIMEDTEXT_LIST") {
          push(`TIMEDTEXT_LIST 未成功，继续尝试 PAGE_CAPTURE。原因：${describeError(errorText)}。`, "warn");
        } else if (path === "PRIMARY_CAPTURE_NOOPEN") {
          push(`PAGE_CAPTURE（不打开 Transcript 面板）未成功。原因：${describeError(errorText)}。`, "warn");
        } else if (path === CHANNEL_YT_PANEL_TRANSCRIPT) {
          if (detail?.nextStep === "none") {
            push(
              `${CHANNEL_YT_PANEL_TRANSCRIPT} 未成功（当前仅启用 ${CHANNEL_YT_PANEL_TRANSCRIPT} 单通道）。原因：${describeError(errorText)}。`,
              "warn"
            );
          } else {
            push(`${CHANNEL_YT_PANEL_TRANSCRIPT} 未成功。原因：${describeError(errorText)}。`, "warn");
          }
        } else if (path === "PRIMARY_CONTEXT_GATE") {
          push(`页面上下文校验未通过。原因：${describeError(errorText)}。`, "warn");
        } else {
          push(`当前步骤未成功，继续尝试下一步。原因：${describeError(errorText)}。`, "warn");
        }
      } else if (status === "ok") {
        if (path === "VOICEINSIGHT_API") {
          const source = normalizeLineText(detail?.source || detail?.engine || "");
          push(
            `字幕提取成功：VOICEINSIGHT_API 返回结果${source ? `（引擎：${source}）` : ""}。`,
            "success"
          );
        } else if (path === "PRIMARY_TRACKS") {
          push("字幕提取成功：CAPTION_TRACK 返回结果。", "success");
        } else if (path === "PRIMARY_TIMEDTEXT_LIST") {
          push("字幕提取成功：TIMEDTEXT_LIST 返回结果。", "success");
        } else if (path === "PRIMARY_CAPTURE_NOOPEN") {
          push("字幕提取成功：PAGE_CAPTURE（不打开 Transcript 面板）返回结果。", "success");
        } else if (path === CHANNEL_YT_PANEL_TRANSCRIPT) {
          push(
            `字幕提取成功：${CHANNEL_YT_PANEL_TRANSCRIPT}（get_panel / transcriptSegmentViewModel）返回结果。`,
            "success"
          );
        } else if (path === "PRIMARY_CAPTURE_DEGRADED") {
          push("VOICEINSIGHT_API 失败，已返回 PAGE_CAPTURE 可用结果。", "warn");
        } else {
          push("字幕提取成功。", "success");
        }
      } else if (status === "error") {
        push(
          `提取链路执行失败：${describeError(detail?.selectedError || detail?.error || "")}。`,
          "error"
        );
      }
      break;
    case CHANNEL_YT_PANEL_TRANSCRIPT:
      if (status === "start") {
        push(
          `开始 ${CHANNEL_YT_PANEL_TRANSCRIPT}${attempt ? `（第 ${attempt} 次）` : ""}：监听 get_panel/get_transcript 请求，并从页面模型读取字幕。`,
          "info"
        );
        if (detail?.allowOpenPanel === false) {
          push("执行模式：严格无感（禁止打开 Transcript 面板）。", "info");
        } else if (detail?.allowOpenPanel === true) {
          push("执行模式：优先成功率（允许打开 Transcript 面板）。", "warn");
        }
      } else if (status === "ok") {
        appendPrimaryDebugMessages(detail?.debug, "ok");
        const lines = Number(detail?.timelineSize || 0);
        push(`${CHANNEL_YT_PANEL_TRANSCRIPT} 成功，共 ${lines} 条字幕。`, "success");
      } else if (status === "error") {
        appendPrimaryDebugMessages(detail?.debug, "error");
        push(`${CHANNEL_YT_PANEL_TRANSCRIPT} 失败：${describeError(detail?.error || errorText)}。`, "error");
      }
      break;
    case "VOICEINSIGHT_API":
      if (status === "start") {
        const engines = Array.isArray(detail?.engines)
          ? detail.engines.map((item) => normalizeVoiceInsightEngineName(item)).filter(Boolean)
          : [];
        const planText =
          engines.length > 0 ? engines.join(" -> ") : "youtube-transcript-api -> yt-dlp";
        push(`开始 VOICEINSIGHT_API：按 ${planText} 顺序尝试。`, "info");
        const timeoutMs = Number(detail?.timeoutMs || 0);
        const timeoutEngineBudgetMs = Number(detail?.timeoutEngineBudgetMs || 0);
        const timeoutOverheadMs = Number(detail?.timeoutOverheadMs || 0);
        if (timeoutMs > 0) {
          push(
            `本次超时预算：总 ${Math.ceil(timeoutMs / 1000)}s（引擎 ${Math.ceil(
              timeoutEngineBudgetMs / 1000
            )}s + 开销 ${Math.ceil(timeoutOverheadMs / 1000)}s）。`,
            "info"
          );
        }
        if (detail?.cooldownBypassed) {
          push("全部引擎均在冷却期，本次已按最早解封引擎强制重试。", "warn");
        }
        if (Array.isArray(detail?.blockedEngines) && detail.blockedEngines.length > 0) {
          const blockedText = detail.blockedEngines
            .map((item) => {
              const name = normalizeVoiceInsightEngineName(item?.engine);
              const blockedMs = Number(item?.blockedMs || 0);
              if (!name || !Number.isFinite(blockedMs) || blockedMs <= 0) return "";
              return `${name}(${Math.ceil(blockedMs / 1000)}s)`;
            })
            .filter(Boolean)
            .join("、");
          if (blockedText) {
            push(`当前引擎冷却：${blockedText}。`, "info");
          }
        }
      } else if (status === "ok") {
        const source = normalizeLineText(detail?.source || detail?.engine || "");
        push(
          `VOICEINSIGHT_API 成功，共 ${Number(detail?.lines || 0)} 条字幕${source ? `（引擎：${source}）` : ""}。`,
          "success"
        );
        if (Array.isArray(detail?.engineAttempts) && detail.engineAttempts.length > 0) {
          const summary = detail.engineAttempts
            .map((item) => {
              const engine = normalizeVoiceInsightEngineName(item?.engine);
              if (!engine) return "";
              const ok = Boolean(item?.ok);
              const code = normalizeLineText(item?.code || "");
              return ok ? `${engine}:ok` : `${engine}:${code || "failed"}`;
            })
            .filter(Boolean)
            .join("；");
          if (summary) {
            push(`引擎结果：${summary}。`, "info");
          }
        }
      } else if (status === "error") {
        push(
          `VOICEINSIGHT_API 失败：${describeError(detail?.error || errorText)}。`,
          "error"
        );
        if (Array.isArray(detail?.engineAttempts) && detail.engineAttempts.length > 0) {
          const summary = detail.engineAttempts
            .map((item) => {
              const engine = normalizeVoiceInsightEngineName(item?.engine);
              if (!engine) return "";
              const code = normalizeLineText(item?.code || "");
              return `${engine}:${code || "failed"}`;
            })
            .filter(Boolean)
            .join("；");
          if (summary) {
            push(`引擎失败明细：${summary}。`, "warn");
          }
        }
      }
      break;
    case "VOICEINSIGHT_COOKIE_BRIDGE":
      if (status === "start") {
        push("检测到 yt-dlp 触发 login_required，开始使用浏览器会话 Cookie 重试。", "info");
      } else if (status === "ok") {
        const count = Number(detail?.cookieCount || 0);
        const bytes = Number(detail?.cookieBytes || 0);
        push(
          `Cookie Bridge 准备完成：共 ${count} 项 Cookie（${bytes} bytes）。`,
          "info"
        );
      } else if (status === "retry") {
        push(`Cookie Bridge 未执行：${describeError(errorText)}。`, "warn");
      } else if (status === "error") {
        push(`Cookie Bridge 重试失败：${describeError(errorText)}。`, "warn");
      }
      break;
    case "VOICEINSIGHT_AGENT":
      if (status === "start") {
        push("正在检查本地 Agent 是否可用。", "info");
      } else if (status === "ok") {
        if (detail?.wokenByLauncher) {
          push("本地 Agent 自动拉起成功。", "success");
        } else {
          push("本地 Agent 健康检查通过。", "success");
        }
      } else if (status === "retry") {
        if (detail?.wakeAttempted && detail?.installGuideTriggered) {
          push("本地 Agent 自动拉起未成功，已触发安装引导。", "warn");
        } else if (detail?.wakeAttempted) {
          push("本地 Agent 自动拉起未成功，请手动启动后重试。", "warn");
        } else if (detail?.installGuideTriggered) {
          push("本地 Agent 未就绪，已触发安装引导。", "warn");
        } else {
          push("本地 Agent 未就绪，请稍后重试。", "warn");
        }
      } else if (status === "error") {
        push("本地 Agent 健康检查失败。", "warn");
      }
      break;
    case "VOICEINSIGHT_AGENT_WAKE":
      if (status === "start") {
        push("检测到 Agent 不可用，尝试自动拉起本地服务。", "info");
      } else if (status === "ok") {
        push("Agent 拉起流程已触发，正在等待服务恢复。", "info");
      } else if (status === "retry") {
        push(`Agent 自动拉起尝试未成功：${describeError(errorText)}。`, "warn");
      } else if (status === "error") {
        push(`Agent 自动拉起失败：${describeError(errorText)}。`, "warn");
      }
      break;
    case "CAPTION_META":
    case "GET_CAPTIONS_META":
      if (status === "start") {
        push("正在读取页面字幕轨道元数据（captionTracks）。", "info");
      } else if (status === "ok") {
        const trackCount = Number(detail?.trackCount || 0);
        const code = normalizeLineText(detail?.languageCode || detail?.selectedLanguageCode || "");
        push(
          `字幕轨道元数据读取成功：共 ${trackCount} 条轨道${code ? `，当前语言 ${code}` : ""}。`,
          "success"
        );
      } else if (status === "error" || status === "retry") {
        push(`字幕轨道元数据读取未成功：${describeError(errorText)}。`, status === "retry" ? "warn" : "error");
      }
      break;
    case "CAPTION_TRACK":
      if (status === "start") {
        push("开始 CAPTION_TRACK：尝试直接请求字幕轨道 timedtext。", "info");
      } else if (status === "error") {
        push(`CAPTION_TRACK 未成功：${describeError(errorText)}。`, "warn");
      }
      break;
    case "PRIMARY_TRACKS_TRACK":
      if (status === "start" && Number(detail?.trackIndex || 0) > 0) {
        const code = normalizeLineText(detail?.languageCode || "");
        push(
          `CAPTION_TRACK 尝试轨道 #${Number(detail?.trackIndex || 0)}${code ? `（${code}）` : ""}。`,
          "info"
        );
      } else if (status === "ok") {
        const size = Number(detail?.timelineSize || 0);
        push(`CAPTION_TRACK 命中可用字幕轨道，获得 ${size} 条字幕。`, "success");
      } else if (status === "retry" && Number(detail?.trackIndex || 0) > 0) {
        push("当前轨道无可用字幕，继续尝试下一轨道。", "warn");
      }
      break;
    case "TIMEDTEXT_LIST":
      if (status === "start") {
        push("开始 TIMEDTEXT_LIST：读取可用字幕轨道列表。", "info");
      } else if (status === "ok") {
        push(`TIMEDTEXT_LIST 读取成功：共 ${Number(detail?.tracks || 0)} 条轨道。`, "success");
      } else if (status === "error") {
        push(`TIMEDTEXT_LIST 未成功：${describeError(errorText)}。`, "warn");
      }
      break;
    case "TIMEDTEXT_LIST_FETCH":
      if (status === "ok") {
        push(
          `TIMEDTEXT_LIST_FETCH 完成：返回 ${Number(detail?.tracks || 0)} 条轨道（payload ${Number(detail?.payloadLength || 0)} 字节）。`,
          "info"
        );
      }
      break;
    case "NORMALIZE_TIMELINE":
      if (status === "ok") {
        const source = normalizeLineText(detail?.source || "");
        push(
          `字幕整理完成，共 ${Number(detail?.lines || 0)} 条${source ? `（来源：${source}）` : ""}。`,
          "success"
        );
      } else if (status === "error") {
        push("字幕整理失败：未得到可展示的字幕内容。", "error");
      }
      break;
    case "TIMESTAMP_ALIGN":
      if (status === "start") {
        push("开始对齐显示时间戳：先无面板采样，再按需开面板/降级分句锚点。", "info");
      } else if (status === "ok") {
        const anchors = Number(detail?.anchors || 0);
        const source = describeTimestampAlignSource(detail?.source || "");
        const applied = detail?.applied !== false;
        if (applied) {
          push(`显示时间戳已对齐（来源：${source}，锚点 ${anchors} 个）。`, "info");
        } else {
          push(`显示时间戳保持不变（来源：${source}，锚点 ${anchors} 个）。`, "info");
        }
      } else if (status === "retry") {
        const reason = describeTimestampAlignReason(detail?.reason || "");
        push(`显示时间戳未完成对齐：${reason}，已保留原始时间戳显示。`, "warn");
      }
      break;
    case "FLOW_DONE":
      if (status === "ok") {
        push("字幕提取流程完成。", "success");
      } else if (status === "error") {
        push(
          `字幕提取失败：${describeError(detail?.error || errorText)}。可点击“复制诊断日志”反馈问题。`,
          "error"
        );
      }
      break;
    default:
      if (status === "error" || status === "retry") {
        const stageLabel = stageLabelMap[stage];
        if (stageLabel) {
          push(
            `${stageLabel}${status === "retry" ? "需重试" : "失败"}：${describeError(errorText)}。`,
            status === "retry" ? "warn" : "error"
          );
        }
      }
      break;
  }

  // 业务日志卡片优先展示细粒度阶段日志；通用日志仅作为兜底。
  // FALLBACK_CHAIN 统一使用通道协议文案，避免出现旧链路命名。
  if (stage === "FALLBACK_CHAIN") {
    if (Array.isArray(universalMessages) && universalMessages.length > 0) {
      return universalMessages;
    }
    return messages;
  }
  if (messages.length === 0 && Array.isArray(universalMessages) && universalMessages.length > 0) {
    return universalMessages;
  }
  return messages;
}

function sanitizeDiagnosticsDetail(detail) {
  const MAX_DEPTH = 6;

  const sanitizeValue = (value, depth = 0) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string") {
      return value.length > 220 ? `${value.slice(0, 220)}...` : value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (Array.isArray(value)) {
      const list = value.slice(0, 20);
      if (depth >= MAX_DEPTH) {
        return list.map((item) => {
          if (
            item === null ||
            item === undefined ||
            typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean"
          ) {
            return item;
          }
          return "[object]";
        });
      }
      return list
        .map((item) => sanitizeValue(item, depth + 1))
        .filter((item) => item !== undefined);
    }
    if (typeof value === "object") {
      if (depth >= MAX_DEPTH) return "[object]";
      const out = {};
      let count = 0;
      for (const [key, child] of Object.entries(value)) {
        if (count >= 20) {
          out.__truncated = true;
          break;
        }
        const sanitized = sanitizeValue(child, depth + 1);
        if (sanitized !== undefined) {
          out[key] = sanitized;
          count += 1;
        }
      }
      return out;
    }
    return String(value);
  };

  const normalized = sanitizeValue(detail, 0);
  if (normalized && typeof normalized === "object" && !Array.isArray(normalized)) {
    return normalized;
  }
  return {};
}

function isNoisyDiagnosticsStage(stage) {
  const key = normalizeLineText(stage).toUpperCase();
  if (!key) return false;
  if (key === "FETCH_PAGE" || key === "FETCH_WORKER") return true;
  return key.includes("TIMEDTEXT_FETCH") || key.includes("LIST_FETCH");
}

function resolveDiagnosticsEventType(stage, status, detail = {}) {
  const key = normalizeLineText(stage).toUpperCase();
  if (!key) return "";
  if (key === "FLOW_INIT") return "flow_init";
  if (key === "ACTIVE_TAB") return "active_tab";
  if (key === "CONTEXT_GATE" || key === "CONTEXT_GATE_RETRY") return "context_gate";
  if (key === "FALLBACK_CHAIN") return "channel_route";
  if (key === "NORMALIZE_TIMELINE") return "normalize_timeline";
  if (key === "TIMESTAMP_ALIGN") return "timestamp_align";
  if (key === "FLOW_DONE") return "flow_done";
  const channelId = resolveChannelIdForStep(stage, detail);
  if (channelId) return "channel_step";
  if (status === "error" || status === "retry") return "aux_error";
  return "";
}

function compactDiagnosticsDebug(debug) {
  if (!debug || typeof debug !== "object") return undefined;
  const pick = (key, fallback = undefined) =>
    debug[key] !== undefined ? debug[key] : fallback;
  const compact = {
    openPath: normalizeLineText(pick("openPath", "")),
    opened: Boolean(pick("opened", false)),
    openAttempted: Boolean(pick("openAttempted", false)),
    openTriggeredByExtension: Boolean(pick("openTriggeredByExtension", false)),
    panelReadyBeforeOpen: Boolean(pick("panelReadyBeforeOpen", false)),
    openVerified: Boolean(pick("openVerified", false)),
    requestCount: Number(pick("requestCount", 0)),
    responseCount: Number(pick("responseCount", 0)),
    pageNativeRequestCount: Number(pick("pageNativeRequestCount", 0)),
    pageNativeResponseCount: Number(pick("pageNativeResponseCount", 0)),
    modelMatchedSource: normalizeLineText(pick("modelMatchedSource", "")),
    modelMatchedTimelineCount: Number(pick("modelMatchedTimelineCount", 0)),
    innertubeProbeTried: Boolean(pick("innertubeProbeTried", false)),
    innertubeParamCount: Number(pick("innertubeParamCount", 0)),
    innertubeMatchedSource: normalizeLineText(pick("innertubeMatchedSource", "")),
    innertubeMatchedTimelineCount: Number(pick("innertubeMatchedTimelineCount", 0)),
  };
  const hasValue = Object.values(compact).some((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    return Boolean(normalizeLineText(value));
  });
  return hasValue ? compact : undefined;
}

function pickCompactDiagnosticsDetail(stage, status, detail = {}, channelId = "") {
  const compact = {};
  const pickString = (key) => normalizeLineText(detail?.[key] || "");
  const pickNumber = (key) => Number(detail?.[key] || 0);

  const keepStringKeys = [
    "videoId",
    "url",
    "mode",
    "reason",
    "strategy",
    "path",
    "nextStep",
    "source",
    "engine",
    "languageCode",
    "languageName",
    "selectedBy",
    "selectedLanguageCode",
    "activeLanguageCode",
    "error",
    "code",
    "fmt",
    "contentType",
  ];
  keepStringKeys.forEach((key) => {
    const value = pickString(key);
    if (value) compact[key] = value;
  });

  const keepNumberKeys = [
    "tabId",
    "attempt",
    "timeoutMs",
    "stableMs",
    "trackCount",
    "tracks",
    "lines",
    "timelineSize",
    "transcriptLength",
    "payloadLength",
    "status",
    "elapsedMs",
  ];
  keepNumberKeys.forEach((key) => {
    const value = pickNumber(key);
    if (Number.isFinite(value) && value > 0) compact[key] = value;
  });
  const keepBooleanKeys = [
    "allowOpenPanel",
    "allowDomPanelOpen",
    "openProbeTried",
    "qualityAccepted",
    "lowQualityRetry",
  ];
  keepBooleanKeys.forEach((key) => {
    if (typeof detail?.[key] === "boolean") {
      compact[key] = Boolean(detail[key]);
    }
  });

  if (channelId) {
    compact.channelId = channelId;
  }
  const compactDebug = compactDiagnosticsDebug(detail?.debug);
  if (compactDebug) {
    compact.debug = compactDebug;
  }

  if (status === "retry" || status === "error") {
    const errorCode = deriveErrorCode(compact.error || pickString("normalizedError"));
    if (errorCode && errorCode !== "E-UNKNOWN") {
      compact.errorCode = errorCode;
    }
  }

  return compact;
}

function shouldMergeCompactEvents(previous, next) {
  if (!previous || !next) return false;
  if (previous.eventType !== next.eventType) return false;
  if (previous.stage !== next.stage) return false;
  if (previous.status !== next.status) return false;
  if (normalizeLineText(previous.channelId) !== normalizeLineText(next.channelId)) {
    return false;
  }
  const prevError = normalizeLineText(previous.detail?.error || "");
  const nextError = normalizeLineText(next.detail?.error || "");
  if (prevError !== nextError) return false;
  const prevPath = normalizeLineText(previous.detail?.path || "");
  const nextPath = normalizeLineText(next.detail?.path || "");
  return prevPath === nextPath;
}

function buildCompactDiagnosticsPayload(run) {
  const steps = Array.isArray(run?.steps) ? run.steps : [];
  const compactEvents = [];
  const channelStats = {};

  steps.forEach((step, index) => {
    const stage = normalizeLineText(step?.stage || "");
    const status = normalizeLineText(step?.status || "");
    const detail = step?.detail && typeof step.detail === "object" ? step.detail : {};
    if (!stage || !status) return;

    const eventType = resolveDiagnosticsEventType(stage, status, detail);
    if (!eventType) return;
    if (isNoisyDiagnosticsStage(stage) && status === "ok") return;

    const channelId = resolveChannelIdForStep(stage, detail);
    const compactDetail = pickCompactDiagnosticsDetail(stage, status, detail, channelId);
    const event = {
      idx: index + 1,
      at: normalizeLineText(step?.at || ""),
      eventType,
      stage,
      status,
      ...(channelId ? { channelId } : {}),
      detail: compactDetail,
    };

    const previous = compactEvents[compactEvents.length - 1];
    if (shouldMergeCompactEvents(previous, event)) {
      previous.count = Number(previous.count || 1) + 1;
      previous.lastAt = event.at || previous.lastAt || previous.at;
      return;
    }
    compactEvents.push(event);

    if (channelId) {
      if (!channelStats[channelId]) {
        channelStats[channelId] = {
          label: getChannelLabel(channelId),
          start: 0,
          ok: 0,
          retry: 0,
          error: 0,
          lastError: "",
        };
      }
      if (status === "start") channelStats[channelId].start += 1;
      if (status === "ok") channelStats[channelId].ok += 1;
      if (status === "retry") channelStats[channelId].retry += 1;
      if (status === "error") channelStats[channelId].error += 1;
      const err = normalizeLineText(compactDetail?.error || "");
      if (err) channelStats[channelId].lastError = err;
    }
  });

  let outputEvents = compactEvents;
  if (compactEvents.length > DIAGNOSTICS_COMPACT_MAX_EVENTS) {
    const head = compactEvents.slice(0, Math.max(40, DIAGNOSTICS_COMPACT_MAX_EVENTS - 20));
    const tail = compactEvents.slice(-20);
    outputEvents = [
      ...head,
      {
        idx: -1,
        at: "",
        eventType: "truncated",
        stage: "TRUNCATED",
        status: "info",
        detail: {
          omittedEvents: compactEvents.length - head.length - tail.length,
        },
      },
      ...tail,
    ];
  }

  return {
    protocolVersion: DIAGNOSTICS_PROTOCOL_VERSION,
    exportMode: DIAGNOSTICS_EXPORT_MODE.compact,
    build: normalizeLineText(run?.build || ""),
    startedAt: normalizeLineText(run?.startedAt || ""),
    finishedAt: normalizeLineText(run?.finishedAt || ""),
    locale: normalizeLineText(run?.locale || ""),
    userAgent: normalizeLineText(run?.userAgent || ""),
    result: normalizeLineText(run?.result || ""),
    errorCode: normalizeLineText(run?.errorCode || ""),
    errorMessage: normalizeLineText(run?.errorMessage || ""),
    summary: {
      inputStepCount: steps.length,
      outputStepCount: outputEvents.length,
      channels: channelStats,
    },
    steps: outputEvents,
  };
}

function buildDiagnosticsPayload(run) {
  if (!run || typeof run !== "object") {
    return {};
  }
  if (ACTIVE_DIAGNOSTICS_EXPORT_MODE === DIAGNOSTICS_EXPORT_MODE.full) {
    return run;
  }
  return buildCompactDiagnosticsPayload(run);
}

function finalizeDiagnosticsSuccess(extra = {}) {
  if (!state.diagnosticsRun) return;
  state.debugCode = "OK";
  addDiagStep("FLOW_DONE", "ok", extra);
  state.diagnosticsRun.finishedAt = new Date().toISOString();
  state.diagnosticsRun.result = "success";
  state.diagnosticsText = buildDiagnosticsText(state.diagnosticsRun);
  state.diagnosticsRun = null;
}

function finalizeDiagnosticsError(error, extra = {}) {
  if (!state.diagnosticsRun) return;
  const code = deriveErrorCode(error);
  state.debugCode = code;
  addDiagStep("FLOW_DONE", "error", {
    code,
    error: errorToMessage(error),
    ...extra,
  });
  state.diagnosticsRun.finishedAt = new Date().toISOString();
  state.diagnosticsRun.result = "error";
  state.diagnosticsRun.errorCode = code;
  state.diagnosticsRun.errorMessage = errorToMessage(error);
  state.diagnosticsText = buildDiagnosticsText(state.diagnosticsRun);
  state.diagnosticsRun = null;
}

function buildDiagnosticsText(payload) {
  const exportPayload = buildDiagnosticsPayload(payload);
  return JSON.stringify(exportPayload, null, 2);
}

function errorToMessage(error) {
  return String(error?.message || error || "");
}

function deriveErrorCode(error) {
  const raw = errorToMessage(error).toLowerCase();
  if (raw.includes("please open a youtube video tab")) return "E-NOT-YOUTUBE";
  if (raw.includes("no active tab")) return "E-NO-ACTIVE-TAB";
  if (raw.includes("caption_payload_mismatch")) return "E-CAP-MISMATCH";
  if (raw.includes("player_response_mismatch")) return "E-CAP-MISMATCH";
  if (raw.includes("player_response_not_found")) return "E-CAP-PR-NOTFOUND";
  if (raw.includes("transcript_panel_not_open")) return "E-DOM-PANEL-NOTOPEN";
  if (raw.includes("transcript_panel_not_found")) return "E-DOM-PANEL-NOTFOUND";
  if (raw.includes("transcript_entry_not_found")) return "E-DOM-ENTRY-NOTFOUND";
  if (raw.includes("transcript_entry_clicked_but_no_text")) return "E-DOM-ENTRY-NODATA";
  if (raw.includes("transcript_unavailable")) return "E-DOM-UNAVAILABLE";
  if (raw.includes("transcript_empty")) return "E-DOM-EMPTY";
  if (raw.includes("innertube_params_missing")) return "E-INNERTUBE-PARAMS";
  if (raw.includes("innertube_context_missing")) return "E-INNERTUBE-CONTEXT";
  if (raw.includes("innertube_http_")) return "E-INNERTUBE-HTTP";
  if (raw.includes("innertube_schema_unmatched")) return "E-INNERTUBE-SCHEMA";
  if (raw.includes("innertube_transcript_unavailable")) return "E-INNERTUBE-UNAVAILABLE";
  if (raw.includes("capture_request_not_observed")) return "E-CAPTURE-NOREQ";
  if (raw.includes("capture_empty_body")) return "E-CAPTURE-EMPTY";
  if (raw.includes("capture_schema_unmatched")) return "E-CAPTURE-SCHEMA";
  if (raw.includes("capture_http_")) return "E-CAPTURE-HTTP";
  if (raw.includes("capture_entry_not_found")) return "E-CAPTURE-ENTRY";
  if (raw.includes("capture_entry_not_effective")) return "E-CAPTURE-ENTRY-NOT-EFFECTIVE";
  if (raw.includes("context_url_mismatch")) return "E-CTX-URL-MISMATCH";
  if (raw.includes("context_mismatch")) return "E-CTX-MISMATCH";
  if (raw.includes("context_not_ready")) return "E-CTX-NOTREADY";
  if (raw.includes("agent_not_ready")) return "E-AGENT-NOTREADY";
  if (raw.includes("agent_health_failed")) return "E-AGENT-HEALTH";
  if (raw.includes("no_caption_tracks")) return "E-TT-LIST-EMPTY";
  if (raw.includes("caption_track_missing_url")) return "E-CAP-NOURL";
  if (raw.includes("timedtext_html_empty")) return "E-TT-HTML-EMPTY";
  if (raw.includes("timedtext_empty_after_caption_track")) return "E-TT-EMPTY";
  if (raw.includes("page_fetch_failed")) return "E-FETCH-PAGE";
  if (raw.includes("failed to fetch")) return "E-FETCH-NETWORK";
  if (raw.includes("third_party_fetch_failed")) return "E-TP-FETCH";
  if (raw.includes("third_party_timeout")) return "E-TP-TIMEOUT";
  if (raw.includes("bridge_timeout_no_output")) return "E-TP-ENGINE-NOOUTPUT";
  if (raw.includes("bridge_timeout_after_output")) return "E-TP-ENGINE-PARTIAL";
  if (raw.includes("third_party_bridge_timeout")) return "E-TP-ENGINE-TIMEOUT";
  if (raw.includes("third_party_login_required")) return "E-TP-LOGIN";
  if (raw.includes("third_party_proxy_failed")) return "E-TP-PROXY";
  if (raw.includes("third_party_python_dependency_missing")) return "E-TP-PY-MISSING";
  if (raw.includes("third_party_yt_dlp_not_installed")) return "E-TP-YTDLP-MISSING";
  if (raw.includes("third_party_no_transcript_found")) return "E-TP-NOTRACK";
  if (raw.includes("third_party_transcripts_disabled")) return "E-TP-DISABLED";
  if (raw.includes("third_party_captions_not_found")) return "E-TP-EMPTY";
  if (raw.includes("third_party_")) return "E-TP-FAILED";
  if (raw.includes("captions_not_found")) return "E-NO-SUBS";
  if (raw.includes("download_failed")) return "E-DOWNLOAD";
  if (raw.includes("copy_failed")) return "E-COPY";
  return "E-UNKNOWN";
}

async function copyDiagnostics() {
  if (!state.diagnosticsText) return;
  try {
    await writeToClipboard(state.diagnosticsText);
    setStatusOverride("status_diagnostics_copied", "success");
  } catch {
    setStatusOverride("status_error_copy", "error");
  }
}

async function refreshTranscript(force = false, options = {}) {
  const mode = options?.mode === "manual"
    ? "manual"
    : options?.mode === "open"
    ? "open"
    : "auto";
  const reason = String(options?.reason || mode || "auto");
  const bypassBlock = Boolean(options?.bypassBlock);
  const allowDomPanelOpen = true;

  if (
    mode !== "manual" &&
    !bypassBlock &&
    state.autoBlockedVideoId &&
    state.videoId &&
    state.videoId === state.autoBlockedVideoId
  ) {
    return;
  }
  if (refreshPromise && !force) {
    return refreshPromise;
  }

  const task = (async () => {
    startDiagnosticsRun();
    clearStatusOverride();
    setPanelStatus("loading", "status_loading", "loading");
    state.rawLines = [];
    state.lines = [];
    state.activeIndex = 0;
    state.transcriptLanguageCode = "";
    state.transcriptLanguageName = "";
    state.transcriptIsAutoGenerated = false;
    render();

    let tabInfo = null;
    try {
      tabInfo = await getActiveYoutubeTabInfo();
      addDiagStep("ACTIVE_TAB", "ok", {
        tabId: tabInfo.tabId,
        videoId: tabInfo.videoId,
        url: tabInfo.url,
        mode,
        reason,
      });
      state.tabId = tabInfo.tabId;
      state.videoId = tabInfo.videoId;
      state.videoUrl = tabInfo.url;
      state.videoTitle = normalizeVideoTitle(tabInfo.title);
      if (getActiveTranscriptStrategy() === TRANSCRIPT_STRATEGY_FULL_CHAIN) {
        await ensureVoiceInsightAgentReady({
          strict: false,
        });
      }
      const transcript = await fetchTranscriptWithFallback(tabInfo, {
        allowDomPanelOpen,
        mode,
      });
      const normalized = normalizeTranscriptEntries(
        transcript?.timeline,
        transcript?.transcript
      );
      if (!normalized.length) {
        addDiagStep("NORMALIZE_TIMELINE", "error", {
          reason: "empty_after_normalize",
        });
        throw new Error("captions_not_found");
      }
      const resolvedLanguage = resolveTranscriptLanguageMetadata(
        transcript,
        normalized
      );
      addDiagStep("NORMALIZE_TIMELINE", "ok", {
        lines: normalized.length,
        languageCode: String(resolvedLanguage.languageCode || "unknown"),
        languageName: String(resolvedLanguage.languageName || ""),
        source: String(transcript?.source || transcript?.engine || ""),
      });

      state.videoTitle =
        normalizeVideoTitle(String(transcript?.title || "").trim()) ||
        normalizeVideoTitle(tabInfo.title);
      state.rawLines = normalized;
      rebuildDisplayLines();
      state.activeIndex = 0;
      state.transcriptLanguageCode = normalizeLineText(
        resolvedLanguage.languageCode
      );
      state.transcriptLanguageName = normalizeLineText(
        resolvedLanguage.languageName
      );
      state.transcriptIsAutoGenerated = Boolean(transcript?.isAutoGenerated);
      state.transcriptSource = normalizeLineText(
        transcript?.source || transcript?.engine || ""
      ).toLowerCase();
      if (state.videoId && state.videoId === state.autoBlockedVideoId) {
        state.autoBlockedVideoId = "";
      }
      setPanelStatus("success", "status_success", "success");
      await alignTranscriptDisplayTimestampsInBackground({
        tabId: tabInfo.tabId,
        videoId: tabInfo.videoId,
        transcript,
        linesSnapshot: normalized,
        mode,
        allowOpenPanelForAnchors: false,
      });
      finalizeDiagnosticsSuccess({
        lines: normalized.length,
        videoId: tabInfo.videoId,
        mode,
        reason,
      });
    } catch (error) {
      state.rawLines = [];
      state.lines = [];
      state.activeIndex = 0;
      state.transcriptLanguageCode = "";
      state.transcriptLanguageName = "";
      state.transcriptIsAutoGenerated = false;
      state.transcriptSource = "";
      const failedVideoId =
        String(tabInfo?.videoId || state.videoId || "").trim();
      if (failedVideoId) {
        state.autoBlockedVideoId = failedVideoId;
      }
      finalizeDiagnosticsError(error, {
        statusKey: mapTranscriptErrorKey(error),
        mode,
        reason,
      });
      setPanelStatus("error", mapTranscriptErrorKey(error), "error");
    }

    render();
  })();

  refreshPromise = task;
  try {
    await task;
  } finally {
    if (refreshPromise === task) {
      refreshPromise = null;
    }
  }
}

async function ensureTranscriptForCurrentVideo(options = {}) {
  const allowCachedOnNoYoutube = Boolean(options?.allowCachedOnNoYoutube);
  const hasCachedTranscript =
    state.status === "success" &&
    getExportLines().length > 0 &&
    Boolean(String(state.videoId || "").trim());

  let tabInfo = null;
  try {
    tabInfo = await getActiveYoutubeTabInfo();
  } catch (error) {
    const message = String(error?.message || error || "").toLowerCase();
    const isNoYoutubeContext =
      message.includes("please open a youtube video tab") ||
      message.includes("no active tab");
    if (allowCachedOnNoYoutube && hasCachedTranscript && isNoYoutubeContext) {
      return;
    }
    throw error;
  }

  const activeVideoId = tabInfo.videoId;
  if (
    state.status !== "success" ||
    !state.videoId ||
    !activeVideoId ||
    state.videoId !== activeVideoId
  ) {
    await refreshTranscript(true, {
      mode: "manual",
      reason: "manual_action_ensure",
      bypassBlock: true,
    });
  }
}

async function handleManualRefreshClick() {
  if (state.actionBusy) return;
  state.actionBusy = true;
  renderActionAvailability();
  try {
    await refreshTranscript(true, {
      mode: "manual",
      reason: "manual_refresh_button",
      bypassBlock: true,
    });
  } finally {
    state.actionBusy = false;
    renderActionAvailability();
  }
}

async function handleDownloadClick() {
  if (state.actionBusy) return;
  state.actionBusy = true;
  renderActionAvailability();

  try {
    await ensureTranscriptForCurrentVideo({
      allowCachedOnNoYoutube: true,
    });
    const exportLines = getExportLines();
    if (state.status !== "success" || exportLines.length === 0) {
      return;
    }

    const format = getActiveExportFormat();
    const content = buildExportText(format, exportLines, {
      includeTimestamp: state.timeModeEnabled,
    });
    const filename = buildCaptionFilename(format, state.videoTitle, state.videoId);
    await downloadTextFile(content, filename, format);

    setStatusOverride("status_downloaded", "success", {
      format: format.toUpperCase(),
    });
  } catch (error) {
    const key = mapDownloadErrorKey(error);
    setStatusOverride(key, "error");
  } finally {
    state.actionBusy = false;
    renderActionAvailability();
  }
}

async function handleCopyClick() {
  if (state.actionBusy) return;
  state.actionBusy = true;
  renderActionAvailability();

  try {
    await ensureTranscriptForCurrentVideo({
      allowCachedOnNoYoutube: true,
    });
    const exportLines = getDisplayLines();
    if (state.status !== "success" || exportLines.length === 0) {
      return;
    }

    const text = buildTxtText(exportLines, {
      includeTimestamp: state.timeModeEnabled,
    });
    await writeToClipboard(text);
    setStatusOverride("status_copied", "success");
  } catch {
    setStatusOverride("status_error_copy", "error");
  } finally {
    state.actionBusy = false;
    renderActionAvailability();
  }
}

async function writeToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!success) {
    throw new Error("copy_failed");
  }
}

function buildCaptionFilename(format, title, videoId) {
  const safeTitle = sanitizeFilename(normalizeVideoTitle(title));
  const safeVideoId = sanitizeFilename(videoId || "");
  const main = safeTitle || safeVideoId || "captions";
  const extension = normalizeExportFormat(format);
  return `VoiceInsight-${main}.${extension}`;
}

async function downloadTextFile(content, filename, format) {
  const safeFormat = normalizeExportFormat(format);
  const mime = getMimeTypeByFormat(safeFormat);
  const blob = new Blob([content], { type: mime });
  const objectUrl = URL.createObjectURL(blob);

  try {
    await new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url: objectUrl,
          filename,
          saveAs: false,
          conflictAction: "uniquify",
        },
        (downloadId) => {
          if (chrome.runtime.lastError || !downloadId) {
            reject(new Error(chrome.runtime.lastError?.message || "download_failed"));
            return;
          }
          resolve(downloadId);
        }
      );
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  }
}

function getActiveExportFormat() {
  const fromDom = normalizeExportFormat(formatSelectEl?.value);
  state.format = fromDom;
  return fromDom;
}

function normalizeTranscriptEntries(entries, transcript) {
  const normalized = [];

  if (Array.isArray(entries)) {
    entries.forEach((entry) => {
      const text = sanitizeTranscriptLineText(entry?.text);
      if (!text) return;
      const timing = resolveEntryTiming(entry);
      if (!timing) return;
      const seconds = timing.seconds;
      const startMs = timing.startMs;
      const timestamp = formatClock(seconds);
      const previous = normalized[normalized.length - 1];
      if (previous && previous.startMs === startMs && previous.text === text) {
        return;
      }

      normalized.push({
        timestamp,
        seconds,
        start: seconds,
        startMs,
        text,
      });
    });
  }

  if (normalized.length > 0) {
    return normalized;
  }

  const fallbackText = sanitizeTranscriptLineText(transcript);
  if (!fallbackText) return [];
  return [
    {
      timestamp: "00:00",
      seconds: 0,
      start: 0,
      startMs: 0,
      text: fallbackText,
    },
  ];
}

async function alignTranscriptDisplayTimestampsInBackground(input) {
  const videoId = String(input?.videoId || "").trim();
  const tabId = Number(input?.tabId || 0);
  const transcript = input?.transcript || {};
  const linesSnapshot = Array.isArray(input?.linesSnapshot) ? input.linesSnapshot : [];
  const mode =
    input?.mode === "manual"
      ? "manual"
      : input?.mode === "open"
      ? "open"
      : "auto";
  const allowOpenPanelForAnchors = Boolean(input?.allowOpenPanelForAnchors);
  if (!videoId || !Number.isFinite(tabId) || tabId <= 0 || linesSnapshot.length < 2) {
    return;
  }
  if (!shouldAlignDisplayTimestamps(transcript)) {
    return;
  }

  try {
    addDiagStep("TIMESTAMP_ALIGN", "start", {
      videoId,
      mode,
      allowOpenPanelForAnchors,
      transcriptSource: String(transcript?.source || transcript?.engine || ""),
    });

    let selectedAnchors = [];
    let selectedSource = "";
    let qualityReason = "";
    let usedOpenPanelProbe = false;
    let noOpenAnchorsCount = 0;
    let openAnchorsCount = 0;
    let heuristicAnchorsCount = 0;
    const setSelectedAnchors = (anchors, source) => {
      if (!Array.isArray(anchors) || anchors.length < TIMESTAMP_ALIGN_MIN_ANCHORS) {
        return false;
      }
      selectedAnchors = anchors;
      selectedSource = source;
      return true;
    };

    const probe = await captureTranscriptViaMainWorld(tabId, {
      allowOpenPanel: false,
      timeoutMs: TIMESTAMP_ALIGN_PROBE_TIMEOUT_MS,
      minTimeoutMs: 380,
      retryHint: false,
      panelDomOnly: true,
    });
    const noOpenSource = String(probe?.data?.source || "");
    const noOpenAnchors =
      probe?.ok && Array.isArray(probe?.data?.timeline)
        ? extractTranscriptTimestampAnchors(probe.data.timeline)
        : [];
    noOpenAnchorsCount = noOpenAnchors.length;
    const noOpenSourceTrusted = isTrustedPanelAnchorSource(noOpenSource);
    const noOpenQuality = assessTimestampAnchorQuality(linesSnapshot, noOpenAnchors, {
      relaxed: noOpenSourceTrusted,
    });
    if (noOpenSourceTrusted && noOpenQuality.ok) {
      setSelectedAnchors(noOpenAnchors, "panel_no_open");
    } else if (!noOpenSourceTrusted) {
      qualityReason = "no_open_untrusted_source";
    } else if (noOpenQuality.reason) {
      qualityReason = `no_open_${noOpenQuality.reason}`;
    }

    if (selectedAnchors.length < TIMESTAMP_ALIGN_MIN_ANCHORS && allowOpenPanelForAnchors) {
      usedOpenPanelProbe = true;
      const openProbe = await captureTranscriptViaMainWorld(tabId, {
        allowOpenPanel: true,
        timeoutMs: TIMESTAMP_ALIGN_OPEN_PANEL_PROBE_TIMEOUT_MS,
        minTimeoutMs: 460,
        retryHint: false,
        panelDomOnly: true,
      });
      const openProbeSource = String(openProbe?.data?.source || "");
      const anchorsFromOpen =
        openProbe?.ok && Array.isArray(openProbe?.data?.timeline)
          ? extractTranscriptTimestampAnchors(openProbe.data.timeline)
          : [];
      openAnchorsCount = anchorsFromOpen.length;
      const openSourceTrusted = isTrustedPanelAnchorSource(openProbeSource);
      const openQuality = assessTimestampAnchorQuality(linesSnapshot, anchorsFromOpen, {
        relaxed: openSourceTrusted,
      });
      if (openSourceTrusted && openQuality.ok) {
        setSelectedAnchors(anchorsFromOpen, "panel_open");
      } else if (!openSourceTrusted) {
        qualityReason = "open_untrusted_source";
      } else if (openQuality.reason) {
        qualityReason = `open_${openQuality.reason}`;
      }
    }

    if (selectedAnchors.length < TIMESTAMP_ALIGN_MIN_ANCHORS) {
      const heuristicAnchors = derivePanelLikeAnchorsFromLines(linesSnapshot);
      heuristicAnchorsCount = heuristicAnchors.length;
      if (heuristicAnchors.length >= TIMESTAMP_ALIGN_MIN_ANCHORS) {
        setSelectedAnchors(heuristicAnchors, "heuristic_lines");
      }
    }

    if (selectedAnchors.length < TIMESTAMP_ALIGN_MIN_ANCHORS) {
      addDiagStep("TIMESTAMP_ALIGN", "retry", {
        videoId,
        mode,
        reason: qualityReason || "anchors_insufficient",
        noOpenAnchors: noOpenAnchorsCount,
        openAnchors: openAnchorsCount,
        heuristicAnchors: heuristicAnchorsCount,
        openProbeTried: allowOpenPanelForAnchors,
      });
      return;
    }

    const alignedLines = applyDisplayTimestampAnchors(linesSnapshot, selectedAnchors);
    const changed = alignedLines.some((line, index) => {
      const before = normalizeTimestamp(linesSnapshot[index]?.displayTimestamp || "");
      const after = normalizeTimestamp(line?.displayTimestamp || "");
      return before !== after;
    });
    if (!changed) {
      addDiagStep("TIMESTAMP_ALIGN", "ok", {
        videoId,
        mode,
        source: selectedSource,
        anchors: selectedAnchors.length,
        applied: false,
        noOpenAnchors: noOpenAnchorsCount,
        openAnchors: openAnchorsCount,
        heuristicAnchors: heuristicAnchorsCount,
        openProbeTried: usedOpenPanelProbe,
      });
      return;
    }

    if (state.videoId !== videoId || state.status !== "success") {
      addDiagStep("TIMESTAMP_ALIGN", "retry", {
        videoId,
        mode,
        reason: "state_outdated",
        source: selectedSource,
      });
      return;
    }
    addDiagStep("TIMESTAMP_ALIGN", "ok", {
      videoId,
      mode,
      source: selectedSource,
      anchors: selectedAnchors.length,
      applied: true,
      usedOpenPanelProbe,
      noOpenAnchors: noOpenAnchorsCount,
      openAnchors: openAnchorsCount,
      heuristicAnchors: heuristicAnchorsCount,
    });
    state.rawLines = alignedLines;
    rebuildDisplayLines();
    renderLineList();
  } catch (error) {
    addDiagStep("TIMESTAMP_ALIGN", "retry", {
      videoId,
      mode,
      reason: "align_exception",
      error: errorToMessage(error),
    });
    // Alignment is best-effort for display only; ignore probe failures.
  }
}

function assessTimestampAnchorQuality(lines, anchors, options = {}) {
  const relaxed = Boolean(options?.relaxed);
  const sortedAnchors = Array.isArray(anchors)
    ? anchors
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b)
    : [];
  if (sortedAnchors.length < TIMESTAMP_ALIGN_MIN_ANCHORS) {
    return { ok: false, reason: "anchors_insufficient" };
  }

  if (!Array.isArray(lines) || lines.length < 2) {
    return { ok: true, reason: "" };
  }

  let lineMaxSec = 0;
  lines.forEach((line, index) => {
    const seconds = getLineSeconds(line, index);
    if (Number.isFinite(seconds) && seconds > lineMaxSec) {
      lineMaxSec = seconds;
    }
  });
  const anchorMaxSec = Number(sortedAnchors[sortedAnchors.length - 1] || 0);
  if (!Number.isFinite(lineMaxSec) || lineMaxSec <= 0 || anchorMaxSec <= 0) {
    return { ok: true, reason: "" };
  }

  if (lineMaxSec < 120) {
    return { ok: true, reason: "" };
  }

  const coverage = anchorMaxSec / lineMaxSec;
  const expectedSpanSec = relaxed
    ? Math.max(TIMESTAMP_ALIGN_EXPECTED_ANCHOR_SPAN_SEC * 2.5, 90)
    : TIMESTAMP_ALIGN_EXPECTED_ANCHOR_SPAN_SEC;
  const minCoverage = relaxed
    ? Math.max(0.16, TIMESTAMP_ALIGN_QUALITY_MIN_COVERAGE * 0.35)
    : TIMESTAMP_ALIGN_QUALITY_MIN_COVERAGE;

  const expectedMinAnchors = Math.max(
    5,
    Math.min(140, Math.floor(lineMaxSec / expectedSpanSec))
  );
  if (sortedAnchors.length < expectedMinAnchors) {
    return {
      ok: false,
      reason: "anchors_sparse",
      expectedMinAnchors,
      anchors: sortedAnchors.length,
      coverage,
      lineMaxSec,
      anchorMaxSec,
    };
  }
  if (coverage < minCoverage) {
    return {
      ok: false,
      reason: "anchors_low_coverage",
      expectedMinAnchors,
      anchors: sortedAnchors.length,
      coverage,
      lineMaxSec,
      anchorMaxSec,
    };
  }
  return {
    ok: true,
    reason: "",
    expectedMinAnchors,
    anchors: sortedAnchors.length,
    coverage,
    lineMaxSec,
    anchorMaxSec,
  };
}

function shouldAlignDisplayTimestamps(transcript) {
  const source = normalizeLineText(
    transcript?.source || transcript?.engine || ""
  ).toLowerCase();
  return (
    source.includes("youtube-transcript-api") ||
    source.includes("yt-dlp") ||
    source.includes("yt_timedtext")
  );
}

function isTrustedPanelAnchorSource(rawSource) {
  const source = normalizeLineText(rawSource).toLowerCase();
  return (
    source.includes("segment_renderer") ||
    source.includes("aria_label_rows")
  );
}

function extractTranscriptTimestampAnchors(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const anchors = [];
  const seen = new Set();
  entries.forEach((entry) => {
    const timing = resolveEntryTiming(entry);
    if (!timing) return;
    const seconds = Math.round(Math.max(0, Number(timing.seconds || 0)) * 1000) / 1000;
    const key = seconds.toFixed(3);
    if (seen.has(key)) return;
    seen.add(key);
    anchors.push(seconds);
  });
  anchors.sort((a, b) => a - b);
  return anchors;
}

function derivePanelLikeAnchorsFromLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2) return [];
  const normalized = lines
    .map((line, index) => ({
      seconds: getLineSeconds(line, index),
      text: normalizeLineText(line?.text),
    }))
    .filter((item) => Number.isFinite(item.seconds) && item.text)
    .sort((a, b) => a.seconds - b.seconds);
  if (normalized.length < 2) return [];

  const anchors = [normalized[0].seconds];
  let chunkStart = normalized[0].seconds;
  let chunkText = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const current = normalized[index];
    const next = normalized[index + 1] || null;
    chunkText = joinSegmentText(chunkText, current.text);
    if (!next) break;

    const chunkDuration = Math.max(0, next.seconds - chunkStart);
    const gapToNext = Math.max(0, next.seconds - current.seconds);
    const hasStrongPunctuation = /[.!?。！？]["')\]]*\s*$/.test(chunkText);
    const hasSoftPunctuation = /[,;:，；：]["')\]]*\s*$/.test(chunkText);

    const shouldSplit =
      chunkDuration >= 8 ||
      (chunkDuration >= 4.6 && (hasStrongPunctuation || gapToNext >= 1.7)) ||
      (chunkDuration >= 6 && hasSoftPunctuation);

    if (shouldSplit) {
      const previousAnchor = anchors[anchors.length - 1];
      if (!Number.isFinite(previousAnchor) || next.seconds > previousAnchor + 0.2) {
        anchors.push(next.seconds);
      }
      chunkStart = next.seconds;
      chunkText = "";
    }
  }

  return anchors.slice(0, 280);
}

function applyDisplayTimestampAnchors(lines, anchors) {
  const sortedAnchors = Array.isArray(anchors)
    ? anchors
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0)
        .sort((a, b) => a - b)
    : [];
  if (!Array.isArray(lines) || lines.length === 0 || sortedAnchors.length === 0) {
    return Array.isArray(lines) ? lines.slice() : [];
  }

  return lines.map((line, index) => {
    const seconds = getLineSeconds(line, index);
    const fallbackSeconds = Number.isFinite(seconds) ? seconds : sortedAnchors[0];
    let anchor = sortedAnchors[0];
    for (let i = 0; i < sortedAnchors.length; i += 1) {
      const current = sortedAnchors[i];
      if (current <= fallbackSeconds + 0.001) {
        anchor = current;
      } else {
        break;
      }
    }
    return {
      ...line,
      displayTimestamp: formatClock(anchor),
    };
  });
}

function resolveEntryTiming(entry) {
  const timestampSeconds = parseTimestampToSeconds(entry?.timestamp);
  const startMsRaw = Number(entry?.startMs);
  const startRaw = Number(entry?.start);
  const secondsRaw = Number(entry?.seconds);

  if (Number.isFinite(startMsRaw)) {
    const safeStartMs = Math.max(0, Math.round(startMsRaw));
    return {
      seconds: Math.max(0, safeStartMs / 1000),
      startMs: safeStartMs,
    };
  }

  const resolveSecondsField = (value) => {
    if (!Number.isFinite(value)) return Number.NaN;
    const safe = Math.max(0, Number(value));
    if (!Number.isFinite(timestampSeconds)) {
      return safe;
    }
    const directDiff = Math.abs(safe - timestampSeconds);
    const millisDiff = Math.abs(safe / 1000 - timestampSeconds);
    if (millisDiff + 0.001 < directDiff) {
      return safe / 1000;
    }
    return safe;
  };

  let seconds = resolveSecondsField(startRaw);
  if (!Number.isFinite(seconds)) {
    seconds = resolveSecondsField(secondsRaw);
  }
  if (!Number.isFinite(seconds) && Number.isFinite(timestampSeconds)) {
    seconds = Math.max(0, timestampSeconds);
  }
  if (!Number.isFinite(seconds)) return null;

  const normalizedSeconds = Math.round(Math.max(0, seconds) * 1000) / 1000;
  return {
    seconds: normalizedSeconds,
    startMs: Math.round(normalizedSeconds * 1000),
  };
}

function rebuildDisplayLines() {
  if (!Array.isArray(state.rawLines) || state.rawLines.length === 0) {
    state.lines = [];
    return;
  }
  // Time toggle only controls timestamp visibility, not transcript granularity.
  state.lines = state.rawLines.slice();
}

function buildTextOnlyTimeline(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return [];
  return lines
    .map((line, index) => {
      const text = normalizeLineText(line?.text);
      if (!text) return null;
      const seconds = getLineSeconds(line, index);
      const startMs = Number.isFinite(line?.startMs)
        ? Number(line.startMs)
        : Number.isFinite(seconds)
        ? Math.round(seconds * 1000)
        : null;
      return {
        timestamp: "",
        seconds: Number.isFinite(seconds) ? seconds : null,
        start: Number.isFinite(line?.start)
          ? Number(line.start)
          : Number.isFinite(seconds)
          ? seconds
          : null,
        startMs: Number.isFinite(startMs) ? startMs : null,
        text,
      };
    })
    .filter(Boolean);
}

function normalizeLanguageCodeValue(value) {
  const raw = normalizeLineText(value).replace(/_/g, "-");
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (
    lower === "unknown" ||
    lower === "und" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "none" ||
    lower === "null"
  ) {
    return "";
  }
  return raw;
}

function resolveTranscriptLanguageMetadata(transcript, normalizedLines = []) {
  let languageCode = normalizeLanguageCodeValue(transcript?.languageCode);
  let languageName = normalizeLineText(transcript?.languageName);

  if (!languageCode && languageName) {
    languageCode = matchLanguageCodeByName(languageName);
  }

  if (!languageCode) {
    const sampleText = buildLanguageSampleText(transcript, normalizedLines);
    languageCode = detectLanguageFromTranscriptText(sampleText);
  }

  if (!languageName && languageCode) {
    languageName = getLanguageDisplayName(languageCode);
  }

  return {
    languageCode: normalizeLanguageCodeValue(languageCode),
    languageName: normalizeLineText(languageName),
  };
}

function buildLanguageSampleText(transcript, normalizedLines = []) {
  const parts = [];
  if (Array.isArray(normalizedLines) && normalizedLines.length > 0) {
    for (let index = 0; index < normalizedLines.length && parts.length < 140; index += 1) {
      const text = normalizeLineText(normalizedLines[index]?.text);
      if (text) parts.push(text);
    }
  }
  const transcriptText = normalizeLineText(transcript?.transcript);
  if (transcriptText) {
    parts.push(transcriptText);
  }
  return normalizeLineText(parts.join(" ")).slice(0, 6000);
}

function matchLanguageCodeByName(rawName) {
  const label = normalizeLineText(rawName).toLowerCase();
  if (!label) return "";
  const entries = [
    { code: "en", names: ["english", "ingles", "inglés", "英语", "英文"] },
    { code: "zh", names: ["chinese", "中文", "汉语", "漢語", "普通话", "普通話", "mandarin"] },
    { code: "ja", names: ["japanese", "日本語"] },
    { code: "ko", names: ["korean", "한국어"] },
    { code: "es", names: ["spanish", "español", "espanol"] },
    { code: "fr", names: ["french", "français", "francais"] },
    { code: "de", names: ["german", "deutsch"] },
    { code: "pt", names: ["portuguese", "português", "portugues"] },
    { code: "it", names: ["italian", "italiano"] },
    { code: "nl", names: ["dutch", "nederlands"] },
    { code: "ru", names: ["russian", "русский"] },
    { code: "uk", names: ["ukrainian", "українська"] },
    { code: "pl", names: ["polish", "polski"] },
    { code: "tr", names: ["turkish", "türkçe", "turkce"] },
    { code: "ar", names: ["arabic", "العربية"] },
    { code: "fa", names: ["persian", "farsi", "فارسی"] },
    { code: "he", names: ["hebrew", "עברית"] },
    { code: "hi", names: ["hindi", "हिन्दी", "हिंदी"] },
    { code: "th", names: ["thai", "ไทย"] },
    { code: "vi", names: ["vietnamese", "tiếng việt", "tieng viet"] },
    { code: "id", names: ["indonesian", "bahasa indonesia"] },
    { code: "el", names: ["greek", "ελληνικά"] },
    { code: "ro", names: ["romanian", "română", "romana"] },
    { code: "cs", names: ["czech", "čeština", "cestina"] },
    { code: "hu", names: ["hungarian", "magyar"] },
    { code: "sv", names: ["swedish", "svenska"] },
    { code: "no", names: ["norwegian", "norsk"] },
    { code: "da", names: ["danish", "dansk"] },
    { code: "fi", names: ["finnish", "suomi"] },
  ];
  for (const entry of entries) {
    if (entry.names.some((name) => label.includes(name))) {
      return entry.code;
    }
  }
  return "";
}

function detectLanguageFromTranscriptText(rawText) {
  const text = normalizeLineText(rawText);
  if (!text) return "";
  const compact = text.replace(/\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/g, " ");

  const contains = (regex) => regex.test(compact);
  if (contains(/[\u3040-\u30ff]/)) return "ja";
  if (contains(/[\uac00-\ud7af]/)) return "ko";
  if (contains(/[\u4e00-\u9fff]/)) return "zh";
  if (contains(/[ієїґІЄЇҐ]/)) return "uk";
  if (contains(/[\u0400-\u04ff]/)) return "ru";
  if (contains(/[گچپژک]/)) return "fa";
  if (contains(/[\u0600-\u06ff]/)) return "ar";
  if (contains(/[\u0590-\u05ff]/)) return "he";
  if (contains(/[\u0900-\u097f]/)) return "hi";
  if (contains(/[\u0e00-\u0e7f]/)) return "th";
  if (contains(/[\u0370-\u03ff]/)) return "el";

  const lower = compact.toLowerCase();
  if (/[ăâđêôơư]/.test(lower)) return "vi";
  if (/[ğışç]/.test(lower)) return "tr";
  if (/[ąęłńśźż]/.test(lower)) return "pl";
  if (/[ěščřžťďňů]/.test(lower)) return "cs";
  if (/[őű]/.test(lower)) return "hu";
  if (/[șţțâî]/.test(lower)) return "ro";

  const tokens =
    lower.match(/[a-záéíóúñüàèìòùâêîôûãõçäëïößåæøœ]+/g) || [];
  if (tokens.length === 0) {
    return "";
  }

  const scoreFromWords = (words) => {
    const set = new Set(words);
    let score = 0;
    for (const token of tokens) {
      if (set.has(token)) score += 1;
    }
    return score;
  };

  const scores = {
    en: scoreFromWords(["the", "and", "you", "for", "that", "with", "have", "this", "not", "are"]),
    es: scoreFromWords(["de", "la", "el", "que", "y", "en", "los", "las", "por", "con", "una"]),
    fr: scoreFromWords(["de", "la", "le", "et", "les", "des", "pour", "avec", "une", "est"]),
    de: scoreFromWords(["der", "die", "das", "und", "mit", "ist", "nicht", "ein", "eine", "den"]),
    pt: scoreFromWords(["de", "que", "e", "o", "do", "da", "em", "para", "uma", "com", "não"]),
    it: scoreFromWords(["di", "e", "che", "la", "il", "per", "con", "una", "sono", "del"]),
    nl: scoreFromWords(["de", "het", "een", "en", "van", "ik", "je", "niet", "dat", "met"]),
    tr: scoreFromWords(["ve", "bu", "bir", "için", "ile", "çok", "ama", "gibi", "da", "de"]),
    pl: scoreFromWords(["i", "w", "na", "nie", "się", "że", "to", "z", "do", "jest"]),
    ro: scoreFromWords(["și", "în", "este", "la", "cu", "pentru", "pe", "un", "o", "nu"]),
    cs: scoreFromWords(["a", "v", "je", "na", "že", "se", "to", "s", "pro", "jak"]),
    hu: scoreFromWords(["és", "hogy", "nem", "egy", "van", "az", "a", "meg", "mert", "ami"]),
    sv: scoreFromWords(["och", "att", "det", "som", "för", "med", "inte", "är", "en", "på"]),
    no: scoreFromWords(["og", "det", "som", "for", "med", "ikke", "er", "en", "på", "jeg"]),
    da: scoreFromWords(["og", "det", "som", "for", "med", "ikke", "er", "en", "på", "vi"]),
    fi: scoreFromWords(["ja", "että", "se", "on", "ei", "kun", "myös", "oli", "mutta", "tämä"]),
    vi: scoreFromWords(["và", "là", "của", "cho", "không", "được", "một", "các", "những", "này"]),
    id: scoreFromWords(["dan", "yang", "di", "ke", "dari", "untuk", "dengan", "ini", "itu", "tidak"]),
  };

  if (/[¿¡ñ]/.test(lower)) {
    scores.es += 2;
  }
  if (/[ãõ]/.test(lower)) {
    scores.pt += 2;
  }
  if (/[åäö]/.test(lower)) {
    scores.sv += 2;
  }
  if (/[æø]/.test(lower)) {
    scores.da += 2;
    scores.no += 2;
  }

  let bestCode = "";
  let bestScore = 0;
  let secondScore = 0;
  Object.entries(scores).forEach(([code, score]) => {
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestCode = code;
      return;
    }
    if (score > secondScore) {
      secondScore = score;
    }
  });

  if (bestScore >= 3 && bestScore >= secondScore + 1) {
    return bestCode;
  }
  return "";
}

function assessPrimaryTranscriptQuality(transcript) {
  const timeline = Array.isArray(transcript?.timeline) ? transcript.timeline : [];
  const source = normalizeLineText(transcript?.source).toLowerCase();
  const durationSec = Number(transcript?.videoDurationSec || 0);
  let maxTimestampSec = 0;
  let suspiciousLineCount = 0;

  timeline.forEach((entry) => {
    const text = normalizeLineText(entry?.text).toLowerCase();
    if (
      /\bsync to video time\b/.test(text) ||
      /^\d{1,3}\s*minutes?\s*,?\s*\d{1,2}\s*seconds?\b/.test(text) ||
      /^\d{1,3}\s*分(?:钟|鐘)\s*\d{1,2}\s*秒(?:钟|鐘)?/.test(text) ||
      /^\d{1,3}\s*seconds?\b/.test(text) ||
      /^\d{1,3}\s*sec\b/.test(text)
    ) {
      suspiciousLineCount += 1;
    }
    const sec = parseTimestampToSeconds(entry?.timestamp);
    if (Number.isFinite(sec) && sec > maxTimestampSec) {
      maxTimestampSec = sec;
    }
  });

  const isDomLikeSource = [
    "panel_text_timeline",
    "semantic_roots",
    "segment_renderer",
    "aria_label_rows",
  ].includes(source);
  const safeDurationSec = Number.isFinite(durationSec) ? Math.max(0, durationSec) : 0;
  const endGapSec =
    safeDurationSec > 0 && maxTimestampSec > 0 ? Math.max(0, safeDurationSec - maxTimestampSec) : 0;
  const coverageRatio =
    safeDurationSec > 0 && maxTimestampSec > 0
      ? Math.min(1, maxTimestampSec / safeDurationSec)
      : 0;
  const sparseThreshold =
    safeDurationSec >= 120 ? Math.max(18, Math.floor(safeDurationSec / 7)) : 0;
  const sparseForDuration =
    sparseThreshold > 0 && timeline.length > 0 && timeline.length < sparseThreshold;
  const likelyTruncated =
    safeDurationSec > 90 &&
    maxTimestampSec > 0 &&
    endGapSec > Math.max(45, Math.floor(safeDurationSec * 0.28)) &&
    timeline.length < Math.max(24, Math.floor(safeDurationSec / 5));
  const lowCoverage =
    safeDurationSec >= 120 &&
    coverageRatio > 0 &&
    coverageRatio < 0.62 &&
    sparseForDuration;
  const hasUiNoise = suspiciousLineCount > 0;
  const shouldFallback =
    hasUiNoise || (isDomLikeSource && likelyTruncated) || lowCoverage;

  return {
    shouldFallback,
    reason: hasUiNoise
      ? "text_noise"
      : isDomLikeSource && likelyTruncated
      ? "likely_truncated"
      : lowCoverage
      ? "low_coverage"
      : "",
    source,
    lines: timeline.length,
    durationSec: safeDurationSec,
    maxTimestampSec,
    endGapSec,
    coverageRatio,
    sparseThreshold,
    suspiciousLineCount,
  };
}

function mapTranscriptErrorKey(error) {
  const raw = String(error?.message || error || "");
  const lower = raw.toLowerCase();

  if (
    lower.includes("please open a youtube video tab") ||
    lower.includes("no active tab")
  ) {
    return "status_error_open_youtube";
  }

  if (
    lower.includes("captions_not_found") ||
    lower.includes("no caption") ||
    lower.includes("no_caption_tracks") ||
    lower.includes("caption_track_missing_url") ||
    lower.includes("timedtext_html_empty") ||
    lower.includes("timedtext_empty_after_caption_track") ||
    lower.includes("player_response_not_found") ||
    lower.includes("player_response_mismatch") ||
    lower.includes("transcript_unavailable") ||
    lower.includes("innertube_params_missing") ||
    lower.includes("innertube_context_missing") ||
    lower.includes("innertube_http_") ||
    lower.includes("innertube_schema_unmatched") ||
    lower.includes("innertube_transcript_unavailable") ||
    lower.includes("capture_request_not_observed") ||
    lower.includes("capture_empty_body") ||
    lower.includes("capture_schema_unmatched") ||
    lower.includes("capture_http_") ||
    lower.includes("capture_entry_not_effective") ||
    lower.includes("capture_entry_not_found") ||
    lower.includes("transcript_panel_not_open") ||
    lower.includes("transcript_panel_not_found") ||
    lower.includes("transcript_entry_not_found") ||
    lower.includes("transcript_entry_clicked_but_no_text") ||
    lower.includes("transcript_empty") ||
    lower.includes("third_party_no_transcript_found") ||
    lower.includes("third_party_transcripts_disabled") ||
    lower.includes("third_party_captions_not_found") ||
    lower.includes("third_party_video_unavailable") ||
    lower.includes("third_party_age_restricted") ||
    lower.includes("third_party_http_404") ||
    lower.includes("no subtitles") ||
    lower.includes("无字幕")
  ) {
    return "error_captions_not_found";
  }

  if (
    lower.includes("agent_not_ready") ||
    lower.includes("agent_health_failed")
  ) {
    return "status_error_agent_required";
  }

  if (
    lower.includes("context_mismatch") ||
    lower.includes("context_url_mismatch") ||
    lower.includes("context_not_ready")
  ) {
    return "status_error_generic";
  }

  return "status_error_generic";
}

function mapDownloadErrorKey(error) {
  const raw = String(error?.message || error || "").toLowerCase();
  if (raw.includes("download") || raw.includes("invalid filename")) {
    return "status_error_download";
  }
  if (
    raw.includes("please open a youtube video tab") ||
    raw.includes("no active tab")
  ) {
    return "status_error_open_youtube";
  }
  return "status_error_generic";
}

async function fetchTranscriptByPrimaryCapture(tabInfo, options = {}) {
  const allowOpenPanel = options?.allowDomPanelOpen !== false;
  const attempt = Number.isFinite(options?.attempt)
    ? Math.max(1, Number(options.attempt))
    : 1;
  const timeoutMs = Number.isFinite(options?.timeoutMs)
    ? Math.max(3200, Math.min(11000, Number(options.timeoutMs)))
    : 5600;
  addDiagStep(CHANNEL_YT_PANEL_TRANSCRIPT, "start", {
    tabId: tabInfo?.tabId,
    videoId: tabInfo?.videoId || "",
    attempt,
    allowOpenPanel,
  });

  const result = await captureTranscriptViaMainWorld(tabInfo.tabId, {
    allowOpenPanel,
    timeoutMs,
    retryHint: attempt > 1,
  });
  if (!result?.ok || !result?.data) {
    const errorCode = String(result?.error || "capture_schema_unmatched");
    addDiagStep(CHANNEL_YT_PANEL_TRANSCRIPT, "error", {
      attempt,
      error: errorCode,
      debug: summarizePrimaryCaptureDebug(result?.debug || null),
    });
    const error = new Error(errorCode);
    if (result?.debug && typeof result.debug === "object") {
      error.diagnostics = result.debug;
    }
    throw error;
  }

  const transcript = String(result?.data?.transcript || "").trim();
  const timelineSize = Array.isArray(result?.data?.timeline)
    ? result.data.timeline.length
    : 0;
  if (!transcript || timelineSize <= 0) {
    addDiagStep(CHANNEL_YT_PANEL_TRANSCRIPT, "error", {
      attempt,
      error: "capture_schema_unmatched",
      debug: summarizePrimaryCaptureDebug(result?.debug || null),
    });
    throw new Error("capture_schema_unmatched");
  }

  addDiagStep(CHANNEL_YT_PANEL_TRANSCRIPT, "ok", {
    attempt,
    timelineSize,
    transcriptLength: transcript.length,
    languageCode: String(result?.data?.languageCode || "unknown"),
    source: String(result?.data?.source || ""),
    videoDurationSec: Number(result?.data?.videoDurationSec || 0),
    debug: summarizePrimaryCaptureDebug(result?.debug || null),
  });
  return result.data;
}

function summarizePrimaryCaptureDebug(debug) {
  if (!debug || typeof debug !== "object") {
    return null;
  }
  const requests = Array.isArray(debug.requests) ? debug.requests : [];
  const pageNativeRequests = Array.isArray(debug.pageNativeRequests)
    ? debug.pageNativeRequests
    : [];
  const selfProbeRequests = Array.isArray(debug.selfProbeRequests)
    ? debug.selfProbeRequests
    : [];
  const statuses = Array.isArray(debug.statuses) ? debug.statuses : [];
  const pageNativeStatuses = Array.isArray(debug.pageNativeStatuses)
    ? debug.pageNativeStatuses
    : [];
  const selfProbeStatuses = Array.isArray(debug.selfProbeStatuses)
    ? debug.selfProbeStatuses
    : [];
  return {
    openPath: String(debug.openPath || ""),
    opened: Boolean(debug.opened),
    openAttempted: Boolean(debug.openAttempted),
    openTriggeredByExtension: Boolean(debug.openTriggeredByExtension),
    panelReadyBeforeOpen: Boolean(debug.panelReadyBeforeOpen),
    openVerified: Boolean(debug.openVerified),
    openClickedLabel: String(debug.openClickedLabel || ""),
    openVerificationWaitMs: Number(debug.openVerificationWaitMs || 0),
    openSurface: debug.openSurface && typeof debug.openSurface === "object"
      ? {
          rootCount: Number(debug.openSurface.rootCount || 0),
          visibleRootCount: Number(debug.openSurface.visibleRootCount || 0),
          segmentRendererCount: Number(debug.openSurface.segmentRendererCount || 0),
          expandedPanelCount: Number(debug.openSurface.expandedPanelCount || 0),
          transcriptTagCount: Number(debug.openSurface.transcriptTagCount || 0),
          domTimelineCount: Number(debug.openSurface.domTimelineCount || 0),
        }
      : null,
    retryHint: Boolean(debug.retryHint),
    retryNudgeTried: Boolean(debug.retryNudgeTried),
    retryNudgeScrolled: Boolean(debug.retryNudgeScrolled),
    requestCount: Number(debug.requestCount || requests.length || 0),
    responseCount: Number(debug.responseCount || requests.length || 0),
    pageNativeRequestCount: Number(
      debug.pageNativeRequestCount || pageNativeRequests.length || 0
    ),
    pageNativeResponseCount: Number(
      debug.pageNativeResponseCount || pageNativeRequests.length || 0
    ),
    selfProbeRequestCount: Number(
      debug.selfProbeRequestCount || selfProbeRequests.length || 0
    ),
    selfProbeResponseCount: Number(
      debug.selfProbeResponseCount || selfProbeRequests.length || 0
    ),
    modelProbeCount: Number(debug.modelProbeCount || 0),
    modelCandidateCount: Number(debug.modelCandidateCount || 0),
    modelMatchedSource: String(debug.modelMatchedSource || ""),
    modelMatchedTimelineCount: Number(debug.modelMatchedTimelineCount || 0),
    domProbeTimelineCount: Number(debug.domProbeTimelineCount || 0),
    innertubeProbeTried: Boolean(debug.innertubeProbeTried),
    innertubeParamCount: Number(debug.innertubeParamCount || 0),
    innertubeHttpStatuses: Array.isArray(debug.innertubeHttpStatuses)
      ? debug.innertubeHttpStatuses.slice(0, 6).map((item) => Number(item || 0))
      : [],
    innertubeMatchedSource: String(debug.innertubeMatchedSource || ""),
    innertubeMatchedTimelineCount: Number(debug.innertubeMatchedTimelineCount || 0),
    statuses: statuses.slice(0, 6),
    pageNativeStatuses: pageNativeStatuses.slice(0, 6),
    selfProbeStatuses: selfProbeStatuses.slice(0, 6),
    firstResponse:
      requests.length > 0
        ? {
            status: Number(requests[0]?.status || 0),
            contentType: String(requests[0]?.contentType || ""),
            payloadLength: Number(requests[0]?.payloadLength || 0),
            via: String(requests[0]?.via || ""),
            bodyPreview: String(requests[0]?.bodyPreview || ""),
          }
        : null,
    firstPageNativeResponse:
      pageNativeRequests.length > 0
        ? {
            status: Number(pageNativeRequests[0]?.status || 0),
            contentType: String(pageNativeRequests[0]?.contentType || ""),
            payloadLength: Number(pageNativeRequests[0]?.payloadLength || 0),
            via: String(pageNativeRequests[0]?.via || ""),
            bodyPreview: String(pageNativeRequests[0]?.bodyPreview || ""),
          }
        : null,
    firstSelfProbeResponse:
      selfProbeRequests.length > 0
        ? {
            status: Number(selfProbeRequests[0]?.status || 0),
            contentType: String(selfProbeRequests[0]?.contentType || ""),
            payloadLength: Number(selfProbeRequests[0]?.payloadLength || 0),
            via: String(selfProbeRequests[0]?.via || ""),
            bodyPreview: String(selfProbeRequests[0]?.bodyPreview || ""),
          }
        : null,
  };
}

function summarizeContextGateDebug(debug) {
  if (!debug || typeof debug !== "object") {
    return null;
  }
  return {
    expectedVideoId: String(debug.expectedVideoId || ""),
    urlVideoId: String(debug.urlVideoId || ""),
    actualVideoId: String(debug.actualVideoId || ""),
    candidateVideoIds: Array.isArray(debug.candidateVideoIds)
      ? debug.candidateVideoIds.slice(0, 4).map((item) => String(item || ""))
      : [],
    matchedExpected: Boolean(debug.matchedExpected),
    mismatch: Boolean(debug.mismatch),
    metadataReady: Boolean(debug.metadataReady),
    readyState: String(debug.readyState || ""),
    stableMs: Number(debug.stableMs || 0),
    elapsedMs: Number(debug.elapsedMs || 0),
    attempts: Number(debug.attempts || 0),
    timedOut: Boolean(debug.timedOut),
  };
}

function isContextGateError(error) {
  const raw = String(error?.message || error || "").toLowerCase();
  return (
    raw.includes("context_not_ready") ||
    raw.includes("context_mismatch") ||
    raw.includes("context_url_mismatch")
  );
}

async function ensureMainWorldVideoContextReady(tabInfo, options = {}) {
  const stage = String(options?.stage || "CONTEXT_GATE");
  const expectedVideoId = String(tabInfo?.videoId || "").trim();
  const timeoutMs = Number.isFinite(options?.timeoutMs)
    ? Math.max(2200, Math.min(18000, Number(options.timeoutMs)))
    : CONTEXT_GATE_TIMEOUT_MS;
  const stableMs = Number.isFinite(options?.stableMs)
    ? Math.max(320, Math.min(3200, Number(options.stableMs)))
    : CONTEXT_GATE_STABLE_MS;

  addDiagStep(stage, "start", {
    tabId: tabInfo?.tabId,
    expectedVideoId,
    timeoutMs,
    stableMs,
  });

  const result = await probeMainWorldVideoContext(tabInfo?.tabId, {
    expectedVideoId,
    timeoutMs,
    stableMs,
  });
  const compactDebug = summarizeContextGateDebug(result?.debug || null);
  if (result?.ok) {
    addDiagStep(stage, "ok", compactDebug || {});
    return result;
  }

  const errorCode = String(result?.error || "context_not_ready");
  addDiagStep(stage, "error", {
    error: errorCode,
    debug: compactDebug,
  });
  const error = new Error(errorCode);
  if (result?.debug && typeof result.debug === "object") {
    error.diagnostics = compactDebug || result.debug;
  }
  throw error;
}

function probeMainWorldVideoContext(tabId, options = {}) {
  const expectedVideoId = String(options?.expectedVideoId || "").trim();
  const timeoutMs = Number.isFinite(options?.timeoutMs)
    ? Math.max(2200, Math.min(18000, Number(options.timeoutMs)))
    : CONTEXT_GATE_TIMEOUT_MS;
  const stableMs = Number.isFinite(options?.stableMs)
    ? Math.max(320, Math.min(3200, Number(options.stableMs)))
    : CONTEXT_GATE_STABLE_MS;

  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        world: "MAIN",
        args: [{ expectedVideoId, timeoutMs, stableMs }],
        func: async (input) => {
          const expected = String(input?.expectedVideoId || "").trim();
          const timeout = Number.isFinite(input?.timeoutMs)
            ? Math.max(2200, Math.min(18000, Number(input.timeoutMs)))
            : 9600;
          const stableTarget = Number.isFinite(input?.stableMs)
            ? Math.max(320, Math.min(3200, Number(input.stableMs)))
            : 760;
          const pollMs = 140;
          const now = () => Date.now();
          const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

          const parseVideoId = (url) => {
            try {
              const parsed = new URL(String(url || ""), window.location.origin);
              if (parsed.hostname.includes("youtu.be")) {
                const path = String(parsed.pathname || "").replace(/^\/+/, "");
                return String(path.split("/")[0] || "").trim();
              }
              const watchId = parsed.searchParams.get("v");
              if (watchId) return String(watchId).trim();
              const parts = parsed.pathname.split("/").filter(Boolean);
              const shortsIndex = parts.indexOf("shorts");
              if (shortsIndex !== -1 && parts[shortsIndex + 1]) {
                return String(parts[shortsIndex + 1]).trim();
              }
              const embedIndex = parts.indexOf("embed");
              if (embedIndex !== -1 && parts[embedIndex + 1]) {
                return String(parts[embedIndex + 1]).trim();
              }
              return "";
            } catch {
              return "";
            }
          };

          const collectCandidateVideoIds = () => {
            const out = [];
            const seen = new Set();
            const push = (value) => {
              const id = String(value || "").trim();
              if (!id || seen.has(id)) return;
              seen.add(id);
              out.push(id);
            };

            const player = document.getElementById("movie_player");
            try {
              if (player && typeof player.getPlayerResponse === "function") {
                const response = player.getPlayerResponse();
                push(response?.videoDetails?.videoId || "");
              }
            } catch {
              // Ignore player response probing failures.
            }
            try {
              if (player && typeof player.getVideoData === "function") {
                const videoData = player.getVideoData();
                push(videoData?.video_id || videoData?.videoId || "");
              }
            } catch {
              // Ignore player probing failures.
            }

            push(window?.ytInitialPlayerResponse?.videoDetails?.videoId || "");

            const watchFlexy = document.querySelector("ytd-watch-flexy");
            push(watchFlexy?.getAttribute?.("video-id") || "");
            push(watchFlexy?.data?.videoDetails?.videoId || "");
            push(watchFlexy?.data?.playerResponse?.videoDetails?.videoId || "");

            const canonicalUrl =
              document.querySelector("link[rel='canonical']")?.href || "";
            push(parseVideoId(canonicalUrl));
            return out.slice(0, 6);
          };

          const hasMetadata = () =>
            Boolean(
              document.querySelector("ytd-watch-metadata") ||
                document.querySelector("ytd-watch-flexy") ||
                document.querySelector("#above-the-fold")
            );

          const startedAt = now();
          let attempts = 0;
          let stableSince = 0;
          let lastSignature = "";
          let lastDebug = {
            expectedVideoId: expected,
            urlVideoId: "",
            actualVideoId: "",
            candidateVideoIds: [],
            matchedExpected: false,
            mismatch: false,
            metadataReady: false,
            readyState: document.readyState,
            stableMs: 0,
            elapsedMs: 0,
            attempts: 0,
            timedOut: false,
          };

          while (now() - startedAt < timeout) {
            attempts += 1;
            const href = String(window.location.href || "");
            const urlVideoId = parseVideoId(href);
            const candidateVideoIds = collectCandidateVideoIds();
            const actualVideoId = String(candidateVideoIds[0] || "");
            const matchedExpected = Boolean(expected && candidateVideoIds.includes(expected));
            const primaryMatched = Boolean(expected && actualVideoId === expected);
            const mismatch = Boolean(
              expected &&
                actualVideoId &&
                actualVideoId !== expected
            );
            const metadataReady = hasMetadata();
            const readyState = document.readyState;
            const isInteractive =
              readyState === "interactive" || readyState === "complete";

            const signature = [
              href,
              urlVideoId,
              candidateVideoIds.join(","),
              metadataReady ? "meta" : "no-meta",
              readyState,
            ].join("|");
            if (signature !== lastSignature) {
              lastSignature = signature;
              stableSince = now();
            }
            const stableDuration = now() - stableSince;
            const ready = Boolean(expected) &&
              urlVideoId === expected &&
              primaryMatched &&
              metadataReady &&
              isInteractive &&
              stableDuration >= stableTarget;

            lastDebug = {
              expectedVideoId: expected,
              urlVideoId,
              actualVideoId,
              candidateVideoIds,
              matchedExpected,
              mismatch,
              metadataReady,
              readyState,
              stableMs: stableDuration,
              elapsedMs: now() - startedAt,
              attempts,
              timedOut: false,
            };

            if (ready) {
              return { ok: true, debug: lastDebug };
            }
            await sleep(pollMs);
          }

          const timeoutDebug = {
            ...lastDebug,
            timedOut: true,
            elapsedMs: now() - startedAt,
            attempts,
          };
          if (
            expected &&
            timeoutDebug.urlVideoId &&
            timeoutDebug.urlVideoId !== expected
          ) {
            return { ok: false, error: "context_url_mismatch", debug: timeoutDebug };
          }
          if (timeoutDebug.mismatch) {
            return { ok: false, error: "context_mismatch", debug: timeoutDebug };
          }
          return { ok: false, error: "context_not_ready", debug: timeoutDebug };
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "context_gate_execute_failed"));
          return;
        }
        const result = results?.[0]?.result;
        if (!result || typeof result !== "object") {
          reject(new Error("context_gate_empty_result"));
          return;
        }
        resolve(result);
      }
    );
  });
}

function captureTranscriptViaMainWorld(tabId, options = {}) {
  const allowOpenPanel = options?.allowOpenPanel !== false;
  const panelDomOnly = Boolean(options?.panelDomOnly);
  const minTimeoutMs = Number.isFinite(options?.minTimeoutMs)
    ? Math.max(320, Math.min(2600, Number(options.minTimeoutMs)))
    : 2600;
  const timeoutMs = Number.isFinite(options?.timeoutMs)
    ? Math.max(minTimeoutMs, Math.min(14000, Number(options.timeoutMs)))
    : 7600;
  const retryHint = Boolean(options?.retryHint);

  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        world: "MAIN",
        args: [{ allowOpenPanel, timeoutMs, retryHint, minTimeoutMs, panelDomOnly }],
        func: async (input) => {
          const allowOpen = input?.allowOpenPanel !== false;
          const panelDomOnly = Boolean(input?.panelDomOnly);
          const minTimeout = Number.isFinite(input?.minTimeoutMs)
            ? Math.max(320, Math.min(2600, Number(input.minTimeoutMs)))
            : 2600;
          const timeout = Number.isFinite(input?.timeoutMs)
            ? Math.max(minTimeout, Math.min(14000, Number(input.timeoutMs)))
            : 7600;
          const retryMode = Boolean(input?.retryHint);

          const now = () => Date.now();
          const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
	          const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
	          const sanitizeTranscriptText = (value) => {
	            const cleaned = normalizeText(value)
	              .replace(/\bsync to video time\b/gi, " ")
	              .replace(
	                /^\s*\d{1,3}\s*minutes?\s*,?\s*\d{1,2}\s*seconds?(?=[a-z\u4e00-\u9fff])/i,
	                ""
	              )
	              .replace(/^\s*\d{1,4}\s*seconds?(?=[a-z\u4e00-\u9fff])/i, "")
	              .replace(/^\s*\d{1,4}\s*sec(?=[a-z\u4e00-\u9fff])/i, "")
	              .replace(/^\s*\d{1,4}\s*秒(?:钟|鐘)?(?=[\u4e00-\u9fff])/i, "")
	              .replace(
	                /^\s*\d{1,3}\s*minutes?\s*,?\s*\d{1,2}\s*seconds?(?:\s*[-–—•:：,，]\s*|\s+)/i,
	                ""
	              )
	              .replace(
	                /^\s*\d{1,3}\s*分(?:钟|鐘)\s*\d{1,2}\s*秒(?:钟|鐘)?(?:\s*[-–—•:：,，]\s*|\s+)/i,
	                ""
	              )
	              .replace(/^\s*\d{1,4}\s*(?:seconds?|sec|秒(?:钟|鐘)?)(?:\s*[-–—•:：,，]\s*|\s+)/i, "");
	            const normalized = normalizeText(cleaned);
	            if (!normalized) return "";
	            if (/^sync to video time$/i.test(normalized)) return "";
	            return normalized;
	          };
	          const normalizeTimestamp = (value) => {
	            const text = normalizeText(value);
	            if (!text) return "";
	            const match = text.match(/(\d{1,2}:)?\d{1,2}:\d{2}/);
	            return match ? match[0] : text;
	          };
	          const pad2 = (value) => String(Math.max(0, Number(value) || 0)).padStart(2, "0");
	          const formatClockFromSeconds = (rawSeconds) => {
	            const total = Math.max(0, Math.floor(Number(rawSeconds) || 0));
	            const hour = Math.floor(total / 3600);
	            const minute = Math.floor((total % 3600) / 60);
	            const second = total % 60;
	            if (hour > 0) {
	              return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
	            }
	            return `${pad2(minute)}:${pad2(second)}`;
	          };
          const readTextRuns = (value) => {
            if (!value) return "";
            if (typeof value.simpleText === "string") return value.simpleText;
            if (Array.isArray(value.runs)) {
              return value.runs.map((run) => String(run?.text || "")).join("");
            }
            if (typeof value.text === "string") return value.text;
            return "";
          };
          const isElementVisible = (element) => {
            if (!element) return false;
            const style = window.getComputedStyle(element);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };
          const readNodeText = (node) =>
            String(
              node?.getAttribute?.("aria-label") ||
                node?.getAttribute?.("title") ||
                node?.getAttribute?.("data-tooltip-text") ||
                node?.getAttribute?.("aria-controls") ||
                node?.textContent ||
                ""
            );
          const normalizeLabel = (value) => normalizeText(value).toLowerCase();
          const isTranscriptActionLabel = (value) => {
            const label = normalizeLabel(value);
            if (!label) return false;
            if (label.includes("subtitle") || label.includes("captions")) return false;
            if (label.includes("transcript")) return true;
            if (label.includes("show transcript")) return true;
            if (label.includes("open transcript")) return true;
            if (label.includes("view transcript")) return true;
            if (label.includes("transcription")) return true;
            if (label.includes("transcripción") || label.includes("transcripcion")) return true;
            if (label.includes("transcrição") || label.includes("transcricao")) return true;
            if (label.includes("transkript")) return true;
            if (label.includes("trascrizione")) return true;
            if (label.includes("transcriptie")) return true;
            return [
              "内容转文字",
              "內容轉文字",
              "显示转录",
              "显示文字稿",
              "显示文字记录",
              "转录",
              "转写",
              "轉寫",
              "文字稿",
              "文字记录",
              "文字紀錄",
            ].some((keyword) => label.includes(keyword));
          };
          const isTranscriptTabElement = (element) => {
            if (!element) return false;
            const role = normalizeLabel(element?.getAttribute?.("role"));
            const controls = normalizeLabel(element?.getAttribute?.("aria-controls"));
            const id = normalizeLabel(element?.id);
            const classes = normalizeLabel(element?.className);
            const label = normalizeLabel(readNodeText(element));
            if (isTranscriptActionLabel(label)) return true;
            if (controls.includes("transcript")) return true;
            if (id.includes("transcript")) return true;
            if (classes.includes("transcript")) return true;
            return role === "tab" && label.includes("transcript");
          };
          const isMenuButtonLabel = (value) => {
            const label = normalizeLabel(value);
            if (!label) return false;
            return (
              label.includes("more") ||
              label.includes("more actions") ||
              label.includes("more options") ||
              label.includes("options") ||
              label.includes("menu") ||
              label.includes("action") ||
              label.includes("plus") ||
              label.includes("mehr") ||
              label.includes("mehr optionen") ||
              label.includes("meer") ||
              label.includes("plus d'options") ||
              label.includes("más") ||
              label.includes("mais") ||
              label.includes("更多") ||
              label.includes("选项") ||
              label.includes("選項") ||
              label.includes("操作")
            );
          };
          const dedupeElements = (elements) => {
            const seen = new Set();
            const out = [];
            elements.forEach((element) => {
              const key =
                element?.getAttribute?.("aria-label") ||
                element?.getAttribute?.("title") ||
                element?.id ||
                element?.outerHTML ||
                "";
              if (!key || seen.has(key)) return;
              seen.add(key);
              out.push(element);
            });
            return out;
          };

          const extractLanguageInfo = (payload) => {
            const stack = [payload];
            const visited = new Set();
            while (stack.length > 0) {
              const current = stack.pop();
              if (!current || typeof current !== "object") continue;
              if (visited.has(current)) continue;
              visited.add(current);
              if (current.transcriptLanguageMenuRenderer) {
                const items = Array.isArray(current.transcriptLanguageMenuRenderer.subMenuItems)
                  ? current.transcriptLanguageMenuRenderer.subMenuItems
                  : [];
                const selected = items.find((item) => item?.selected) || items[0];
                if (selected && typeof selected === "object") {
                  const languageCode = normalizeText(
                    selected.languageCode || selected.language || ""
                  );
                  const languageName = normalizeText(
                    selected?.title?.simpleText ||
                      selected?.title?.runs?.[0]?.text ||
                      ""
                  );
                  return { languageCode, languageName };
                }
              }
              if (Array.isArray(current)) {
                current.forEach((item) => {
                  if (item && typeof item === "object") stack.push(item);
                });
                continue;
              }
              Object.values(current).forEach((value) => {
                if (value && typeof value === "object") stack.push(value);
              });
            }
            return { languageCode: "", languageName: "" };
          };

	          const parseTranscriptPayload = (payload) => {
	            const timeline = [];
            const pushLine = (timestampRaw, textRaw) => {
              const timestamp = normalizeTimestamp(timestampRaw);
              const text = sanitizeTranscriptText(textRaw);
              if (!text) return;
              const previous = timeline[timeline.length - 1];
              if (previous && previous.timestamp === timestamp && previous.text === text) {
                return;
              }
              timeline.push({ timestamp, text });
            };
            const readRendererTimestamp = (renderer) =>
              readTextRuns(renderer?.startTimeText) ||
              readTextRuns(renderer?.cueStartTimeText) ||
              readTextRuns(renderer?.formattedStartOffset) ||
              readTextRuns(renderer?.startOffsetText) ||
              "";
            const readRendererText = (renderer) =>
              readTextRuns(renderer?.snippet) ||
              readTextRuns(renderer?.snippetText) ||
              readTextRuns(renderer?.text) ||
              readTextRuns(renderer?.bodyText) ||
              readTextRuns(renderer?.cue) ||
              readTextRuns(renderer?.line) ||
              "";
            const readSegmentViewModelTimestamp = (model) =>
              (typeof model?.timestamp === "string" ? model.timestamp : "") ||
              readTextRuns(model?.timestampText) ||
              readTextRuns(model?.startTimeText) ||
              readTextRuns(model?.cueStartTimeText) ||
              "";
            const readSegmentViewModelText = (model) =>
              (typeof model?.simpleText === "string" ? model.simpleText : "") ||
              readTextRuns(model?.snippet) ||
              readTextRuns(model?.snippetText) ||
              readTextRuns(model?.text) ||
              "";
            const visited = new Set();
            const walk = (node) => {
              if (!node || typeof node !== "object") return;
              if (visited.has(node)) return;
              visited.add(node);
	              if (Array.isArray(node)) {
	                node.forEach((item) => walk(item));
	                return;
	              }
              if (node.transcriptSegmentRenderer) {
                const renderer = node.transcriptSegmentRenderer;
                pushLine(readRendererTimestamp(renderer), readRendererText(renderer));
                return;
              }
              if (node.transcriptSearchPanelTranscriptSegmentRenderer) {
                const renderer = node.transcriptSearchPanelTranscriptSegmentRenderer;
                pushLine(readRendererTimestamp(renderer), readRendererText(renderer));
                return;
              }
              if (node.transcriptSegmentViewModel) {
                const model = node.transcriptSegmentViewModel;
                pushLine(readSegmentViewModelTimestamp(model), readSegmentViewModelText(model));
                return;
              }
              if (node.transcriptCueRenderer) {
                const renderer = node.transcriptCueRenderer;
                pushLine(readRendererTimestamp(renderer), readRendererText(renderer));
                return;
              }
              if (node.transcriptCueGroupRenderer) {
                const group = node.transcriptCueGroupRenderer;
                if (Array.isArray(group?.cues)) {
                  group.cues.forEach((cue) => walk(cue));
                  return;
                }
                if (group?.cue) {
                  walk(group.cue);
                  return;
                }
              }
              if (node.startTimeText && (node.snippet || node.text || node.bodyText || node.cue)) {
                pushLine(readRendererTimestamp(node), readRendererText(node));
                return;
              }
              Object.values(node).forEach((value) => {
                if (value && typeof value === "object") {
                  walk(value);
                }
              });
            };
            walk(payload);
	            const text = timeline.map((entry) => entry.text).join(" ").trim();
	            const language = extractLanguageInfo(payload);
	            return {
	              text,
	              timeline: timeline.filter((entry) => Boolean(entry.timestamp)),
	              languageCode: language.languageCode || "",
	              languageName: language.languageName || "",
                source: "payload",
	            };
	          };

	          const parseTranscriptBody = (body) => {
	            const raw = String(body || "");
	            if (!raw.trim()) return null;
	            const cleaned = raw.replace(/^\)\]\}'\s*/, "").trim();
	            if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) return null;
	            try {
	              const payload = JSON.parse(cleaned);
	              return parseTranscriptPayload(payload);
	            } catch {
	              return null;
	            }
	          };

	          const isTimestampOnlyLine = (value) =>
	            /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(normalizeText(value));

	          const pushTimelineEntry = (timeline, timestampRaw, textRaw) => {
	            const timestamp = normalizeTimestamp(timestampRaw);
	            const text = sanitizeTranscriptText(textRaw);
	            if (!timestamp || !text || isTimestampOnlyLine(text)) return;
	            const previous = timeline[timeline.length - 1];
	            if (previous && previous.timestamp === timestamp && previous.text === text) {
	              return;
	            }
	            timeline.push({ timestamp, text });
	          };

	          const parseLineFromSegmentText = (rawText) => {
	            const normalized = normalizeText(rawText);
	            if (!normalized) {
	              return { timestamp: "", text: "" };
	            }
	            const match = normalized.match(
	              /^((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s*[-–—]\s*|\s*)?(.*)$/
	            );
	            if (match) {
	              const parsedText = sanitizeTranscriptText(match[2]);
	              return {
	                timestamp: normalizeTimestamp(match[1]),
	                text: isTimestampOnlyLine(parsedText) ? "" : parsedText,
	              };
	            }
	            if (isTimestampOnlyLine(normalized)) {
	              return { timestamp: normalizeTimestamp(normalized), text: "" };
	            }
	            return { timestamp: "", text: sanitizeTranscriptText(normalized) };
	          };

	          const parseEntryFromAriaLabel = (rawLabel) => {
	            const normalized = normalizeText(rawLabel);
	            if (!normalized) return null;
	            const fromClock = normalized.match(
	              /^((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s*[-–—•|:：]\s*|\s+)(.+)$/
	            );
	            if (fromClock) {
	              const timestamp = normalizeTimestamp(fromClock[1]);
	              const text = sanitizeTranscriptText(fromClock[2]);
	              if (!timestamp || !text || isTimestampOnlyLine(text)) return null;
	              return { timestamp, text };
	            }

	            const fromMinSecEn = normalized.match(
	              /^(\d{1,3})\s*minutes?\s*,?\s*(\d{1,2})\s*seconds?(?:\s*[-–—•|:：,，]\s*|\s+)?(.*)$/i
	            );
	            if (fromMinSecEn) {
	              const minutes = Number.parseInt(fromMinSecEn[1], 10);
	              const secondsPart = Number.parseInt(fromMinSecEn[2], 10);
	              if (Number.isFinite(minutes) && Number.isFinite(secondsPart)) {
	                const timestamp = formatClockFromSeconds(minutes * 60 + secondsPart);
	                const text = sanitizeTranscriptText(
	                  String(fromMinSecEn[3] || "").replace(/^[\s\-–—•|:：,，]+/, "")
	                );
	                if (!text || isTimestampOnlyLine(text)) return null;
	                return { timestamp, text };
	              }
	            }

	            const fromMinSecZh = normalized.match(
	              /^(\d{1,3})\s*分(?:钟|鐘)\s*(\d{1,2})\s*秒(?:钟|鐘)?(.*)$/i
	            );
	            if (fromMinSecZh) {
	              const minutes = Number.parseInt(fromMinSecZh[1], 10);
	              const secondsPart = Number.parseInt(fromMinSecZh[2], 10);
	              if (Number.isFinite(minutes) && Number.isFinite(secondsPart)) {
	                const timestamp = formatClockFromSeconds(minutes * 60 + secondsPart);
	                const text = sanitizeTranscriptText(
	                  String(fromMinSecZh[3] || "").replace(/^[\s\-–—•|:：,，]+/, "")
	                );
	                if (!text || isTimestampOnlyLine(text)) return null;
	                return { timestamp, text };
	              }
	            }

	            const fromSecOnly = normalized.match(
	              /^(\d{1,4})\s*(?:seconds?|sec|秒(?:钟|鐘)?)(.*)$/i
	            );
	            if (fromSecOnly) {
	              const seconds = Number.parseInt(fromSecOnly[1], 10);
	              if (Number.isFinite(seconds)) {
	                const timestamp = formatClockFromSeconds(Math.max(0, seconds));
	                const text = sanitizeTranscriptText(
	                  String(fromSecOnly[2] || "").replace(/^[\s\-–—•|:：,，]+/, "")
	                );
	                if (!text || isTimestampOnlyLine(text)) return null;
	                return { timestamp, text };
	              }
	            }
	            return null;
	          };

	          const readTranscriptEntryFromSegment = (segment) => {
	            const timestampNode = segment.querySelector(
	              "#start, .segment-timestamp, .cue-group-start-offset, [id*='timestamp'], [class*='timestamp'], [class*='start-offset']"
	            );
	            const textNode = segment.querySelector(
	              "#segment-text, .segment-text, [id*='segment-text'], [class*='segment-text'], yt-formatted-string"
	            );
	            let timestamp = normalizeTimestamp(timestampNode?.textContent);
	            let text = sanitizeTranscriptText(textNode?.textContent);
	            if (!text) {
	              const parsed = parseLineFromSegmentText(segment?.textContent);
	              if (!timestamp && parsed.timestamp) {
	                timestamp = parsed.timestamp;
	              }
	              text = parsed.text;
	            }
	            if (!text || isTimestampOnlyLine(text)) {
	              return null;
	            }
	            return { timestamp, text };
	          };

	          const extractTimelineFromTextBlob = (rawText) => {
	            const compact = normalizeText(String(rawText || "").replace(/\u00a0/g, " "));
	            if (!compact) return [];
	            const matches = Array.from(compact.matchAll(/((?:\d{1,2}:)?\d{1,2}:\d{2})/g));
	            if (matches.length === 0) return [];
	            const timeline = [];
	            for (let i = 0; i < matches.length; i += 1) {
	              const current = matches[i];
	              const next = matches[i + 1] || null;
	              const timestamp = normalizeTimestamp(current?.[1] || "");
	              if (!timestamp) continue;
	              const currentIndex = Number.isInteger(current.index) ? current.index : 0;
	              const nextIndex =
	                next && Number.isInteger(next.index) ? next.index : compact.length;
	              const contentStart = currentIndex + String(current[1] || "").length;
	              const segmentText = String(compact.slice(contentStart, nextIndex) || "")
	                .replace(/^[\s\-–—•:]+/, "")
	                .trim();
	              if (!segmentText) continue;
	              const cleanedSegmentText = sanitizeTranscriptText(segmentText);
	              if (!cleanedSegmentText) continue;
	              pushTimelineEntry(timeline, timestamp, cleanedSegmentText);
	            }
	            return timeline;
	          };

	          const parseTranscriptFromPanelDom = () => {
	            const segmentRenderers = Array.from(
	              document.querySelectorAll("ytd-transcript-segment-renderer")
	            );
	            if (segmentRenderers.length > 0) {
	              const timeline = [];
	              for (const segment of segmentRenderers) {
	                const entry = readTranscriptEntryFromSegment(segment);
	                if (!entry?.text) continue;
	                pushTimelineEntry(timeline, entry.timestamp, entry.text);
	              }
	              if (timeline.length > 0) {
	                return {
	                  text: timeline.map((entry) => entry.text).join(" ").trim(),
	                  timeline,
	                  languageCode: "",
	                  languageName: "",
	                  source: "segment_renderer",
	                };
	              }
	            }

	            const transcriptRoots = Array.from(
	              document.querySelectorAll(
	                "ytd-transcript-segment-list-renderer, ytd-transcript-body-renderer, ytd-transcript-renderer, ytd-transcript-search-panel-renderer, ytd-engagement-panel-section-list-renderer[target-id*='transcript']"
	              )
	            ).slice(0, 8);
	            let bestAriaTimeline = [];
	            for (const root of transcriptRoots) {
	              if (!isElementVisible(root)) continue;
	              const rowNodes = Array.from(
	                root.querySelectorAll(
	                  "ytd-transcript-segment-renderer[aria-label], button[aria-label], [role='button'][aria-label], tp-yt-paper-item[aria-label]"
	                )
	              ).slice(0, 420);
	              if (rowNodes.length === 0) continue;
	              const timeline = [];
	              for (const row of rowNodes) {
	                if (!isElementVisible(row)) continue;
	                const entry = parseEntryFromAriaLabel(readNodeText(row));
	                if (!entry?.text) continue;
	                pushTimelineEntry(timeline, entry.timestamp, entry.text);
	              }
	              if (timeline.length > bestAriaTimeline.length) {
	                bestAriaTimeline = timeline;
	              }
	            }
	            if (bestAriaTimeline.length > 0) {
	              return {
	                text: bestAriaTimeline.map((entry) => entry.text).join(" ").trim(),
	                timeline: bestAriaTimeline,
	                languageCode: "",
	                languageName: "",
	                source: "aria_label_rows",
	              };
	            }

	            const transcriptPanel = document.querySelector(
	              "ytd-transcript-body-renderer, ytd-transcript-renderer, ytd-transcript-search-panel-renderer, ytd-engagement-panel-section-list-renderer[target-id*='transcript']"
	            );
	            if (transcriptPanel) {
	              const panelTimeline = extractTimelineFromTextBlob(transcriptPanel.textContent);
	              if (panelTimeline.length > 0) {
	                return {
	                  text: panelTimeline.map((entry) => entry.text).join(" ").trim(),
	                  timeline: panelTimeline,
	                  languageCode: "",
	                  languageName: "",
	                  source: "panel_text_timeline",
	                };
	              }
	            }

	            const semanticRoots = Array.from(
	              document.querySelectorAll(
	                "ytd-engagement-panel-section-list-renderer, ytd-transcript-renderer, ytd-transcript-body-renderer, ytd-transcript-search-panel-renderer, [target-id*='transcript']"
	              )
	            ).slice(0, 24);
	            let bestTimeline = [];
	            for (const root of semanticRoots) {
	              if (!isElementVisible(root)) continue;
	              const rawText = String(root?.textContent || "");
	              if (!rawText || !/\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/.test(rawText)) continue;
	              const timeline = extractTimelineFromTextBlob(rawText);
	              if (timeline.length > bestTimeline.length) {
	                bestTimeline = timeline;
	              }
	            }
	            if (bestTimeline.length > 0) {
	              return {
	                text: bestTimeline.map((entry) => entry.text).join(" ").trim(),
	                timeline: bestTimeline,
	                languageCode: "",
	                languageName: "",
	                source: "semantic_roots",
	              };
	            }
	            return null;
	          };

          const isPanelDomSource = (value) => {
            const source = normalizeText(value).toLowerCase();
            return (
              source === "segment_renderer" ||
              source === "aria_label_rows" ||
              source === "panel_text_timeline" ||
              source === "semantic_roots"
            );
          };

	          const collectModelPayloadCandidates = () => {
	            const candidates = [];
	            const seen = new Set();
	            const push = (value, source) => {
	              if (!value || typeof value !== "object") return;
	              if (seen.has(value)) return;
	              seen.add(value);
	              candidates.push({ value, source });
	            };

	            const roots = Array.from(
	              document.querySelectorAll(
	                "ytd-transcript-search-panel-renderer, ytd-transcript-renderer, ytd-transcript-body-renderer, ytd-engagement-panel-section-list-renderer[target-id*='transcript']"
	              )
	            ).slice(0, 8);
	            roots.forEach((root, index) => {
	              push(root?.data, `transcript_root_${index}.data`);
	              push(root?.__data, `transcript_root_${index}.__data`);
	              push(root?.polymerController?.data, `transcript_root_${index}.polymer_data`);
	              push(root?.__dataHost?.data, `transcript_root_${index}.host_data`);
	              push(root?.__dataHost?.__data, `transcript_root_${index}.host___data`);
	            });

	            const watchFlexy = document.querySelector("ytd-watch-flexy");
	            push(watchFlexy?.data, "watch_flexy.data");
	            push(watchFlexy?.__data, "watch_flexy.__data");
	            push(watchFlexy?.polymerController?.data, "watch_flexy.polymer_data");

	            const app = document.querySelector("ytd-app");
	            push(app?.data, "ytd_app.data");
	            push(window?.ytInitialData, "ytInitialData");
	            return candidates;
	          };

	          const buildCaptureData = (parsed) => ({
	            transcript: sanitizeTranscriptText(parsed?.text || ""),
	            timeline: Array.isArray(parsed?.timeline) ? parsed.timeline : [],
	            languageCode: String(parsed?.languageCode || "unknown"),
	            languageName: String(parsed?.languageName || ""),
	            title: String(document.title || "").replace(/\s*-\s*youtube\s*$/i, "").trim(),
              source: String(parsed?.source || ""),
              videoDurationSec: Number.isFinite(Number(document.querySelector("video")?.duration))
                ? Math.max(0, Math.floor(Number(document.querySelector("video")?.duration)))
                : 0,
          });

          const isTranscriptRequestUrl = (url) =>
            /\/youtubei\/v1\/(?:get_transcript|get_panel)\b/i.test(String(url || ""));

	          const debug = {
	            retryHint: retryMode,
	            retryNudgeTried: false,
	            retryNudgeScrolled: false,
	            opened: false,
	            openAttempted: false,
	            openTriggeredByExtension: false,
	            panelReadyBeforeOpen: false,
	            openPath: "",
              openVerified: false,
              openClickedLabel: "",
              openVerificationWaitMs: 0,
              openSurface: null,
	            requestCount: 0,
	            responseCount: 0,
	            pageNativeRequestCount: 0,
	            pageNativeResponseCount: 0,
	            selfProbeRequestCount: 0,
	            selfProbeResponseCount: 0,
	            modelProbeCount: 0,
	            modelCandidateCount: 0,
	            modelMatchedSource: "",
	            modelMatchedTimelineCount: 0,
	            domProbeTimelineCount: 0,
	            innertubeProbeTried: false,
	            innertubeParamCount: 0,
	            innertubeHttpStatuses: [],
	            innertubeMatchedSource: "",
	            innertubeMatchedTimelineCount: 0,
	            statuses: [],
	            pageNativeStatuses: [],
	            selfProbeStatuses: [],
	            requests: [],
	            pageNativeRequests: [],
	            selfProbeRequests: [],
	            timedOut: false,
	            elapsedMs: 0,
	          };
          let selfProbeFetchDepth = 0;
          const pushStatus = (list, status) => {
            const numeric = Number(status);
            if (!Number.isFinite(numeric) || numeric <= 0) return;
            if (!list.includes(numeric)) {
              list.push(numeric);
            }
            if (list.length > 8) {
              list.splice(0, list.length - 8);
            }
          };
	          const pushRequest = (item, sourceTag = "page_native") => {
	            const source = sourceTag === "self_probe" ? "self_probe" : "page_native";
	            debug.responseCount += 1;
	            pushStatus(debug.statuses, item.status);
	            if (source === "self_probe") {
	              debug.selfProbeResponseCount += 1;
	              debug.selfProbeRequestCount += 1;
	              pushStatus(debug.selfProbeStatuses, item.status);
	              if (debug.selfProbeRequests.length < 8) {
	                debug.selfProbeRequests.push(item);
	              }
	            } else {
	              debug.pageNativeResponseCount += 1;
	              debug.pageNativeRequestCount += 1;
	              pushStatus(debug.pageNativeStatuses, item.status);
	              if (debug.pageNativeRequests.length < 8) {
	                debug.pageNativeRequests.push(item);
	              }
	            }
	            if (debug.requests.length < 8) {
	              debug.requests.push(item);
	            }
	          };

	          const parseTranscriptFromPageModels = () => {
	            debug.modelProbeCount += 1;
	            const modelCandidates = collectModelPayloadCandidates();
	            if (modelCandidates.length > debug.modelCandidateCount) {
	              debug.modelCandidateCount = modelCandidates.length;
	            }
	            if (!panelDomOnly) {
	              for (const candidate of modelCandidates) {
	                const parsed = parseTranscriptPayload(candidate.value);
	                if (!parsed?.timeline?.length) continue;
	                debug.modelMatchedSource = String(candidate.source || "");
	                debug.modelMatchedTimelineCount = parsed.timeline.length;
	                return parsed;
	              }
	            }
	            const domParsed = parseTranscriptFromPanelDom();
	            if (domParsed?.timeline?.length) {
	              debug.domProbeTimelineCount = Math.max(
	                debug.domProbeTimelineCount,
	                domParsed.timeline.length
	              );
	              if (!debug.modelMatchedSource) {
	                debug.modelMatchedSource = String(domParsed.source || "panel_dom");
	              }
	              debug.modelMatchedTimelineCount = Math.max(
	                debug.modelMatchedTimelineCount,
	                domParsed.timeline.length
	              );
	              return domParsed;
	            }
	            return null;
	          };

	          const decodeScriptParam = (value) =>
	            String(value || "")
	              .replace(/\\u0026/g, "&")
	              .replace(/\\u003d/g, "=")
	              .replace(/\\\//g, "/")
	              .trim();

	          const buildTranscriptParamsCandidates = (rawParams) => {
	            const out = [];
	            const seen = new Set();
	            const push = (value) => {
	              const normalized = String(value || "").trim();
	              if (!normalized || seen.has(normalized)) return;
	              seen.add(normalized);
	              out.push(normalized);
	            };
	            push(rawParams);
	            try {
	              push(decodeURIComponent(String(rawParams || "")));
	            } catch {
	              // Ignore malformed URI.
	            }
	            return out;
	          };

	          const collectTranscriptParamsFromObject = (root, source, pushParams) => {
	            const stack = [root];
	            const visited = new Set();
	            let steps = 0;
	            while (stack.length > 0 && steps < 2600) {
	              steps += 1;
	              const current = stack.pop();
	              if (!current || typeof current !== "object") continue;
	              if (visited.has(current)) continue;
	              visited.add(current);

	              const directEndpoint = current.getTranscriptEndpoint;
	              if (directEndpoint && typeof directEndpoint === "object") {
	                pushParams(directEndpoint.params, `${source}.getTranscriptEndpoint`);
	              }
	              const nestedEndpoint = current?.openTranscriptCommand?.getTranscriptEndpoint;
	              if (nestedEndpoint && typeof nestedEndpoint === "object") {
	                pushParams(
	                  nestedEndpoint.params,
	                  `${source}.openTranscriptCommand.getTranscriptEndpoint`
	                );
	              }
	              if (
	                current?.commandMetadata?.webCommandMetadata?.apiUrl &&
	                String(current.commandMetadata.webCommandMetadata.apiUrl).includes(
	                  "get_transcript"
	                )
	              ) {
	                pushParams(current.params, `${source}.commandMetadata`);
	              }

	              if (Array.isArray(current)) {
	                for (let i = current.length - 1; i >= 0; i -= 1) {
	                  const item = current[i];
	                  if (item && typeof item === "object") {
	                    stack.push(item);
	                  }
	                }
	                continue;
	              }
	              const values = Object.values(current);
	              for (let i = values.length - 1; i >= 0; i -= 1) {
	                const value = values[i];
	                if (value && typeof value === "object") {
	                  stack.push(value);
	                }
	              }
	            }
	          };

	          const collectTranscriptParamsCandidatesFromModels = () => {
	            const out = [];
	            const seen = new Set();
	            const pushParams = (rawParams, source) => {
	              const paramsList = buildTranscriptParamsCandidates(rawParams);
	              paramsList.forEach((params) => {
	                const key = `${params}@@${source}`;
	                if (seen.has(key)) return;
	                seen.add(key);
	                out.push({ params, source });
	              });
	            };

	            const modelCandidates = collectModelPayloadCandidates();
	            modelCandidates.forEach((candidate) => {
	              collectTranscriptParamsFromObject(
	                candidate?.value,
	                String(candidate?.source || "model"),
	                pushParams
	              );
	            });

	            const regex =
	              /"getTranscriptEndpoint"\s*:\s*\{[\s\S]{0,240}?"params"\s*:\s*"([^"]+)"/g;
	            const scripts = Array.from(document.scripts || []);
	            scripts.forEach((script, index) => {
	              const text = String(script?.textContent || "");
	              if (!text || !text.includes("getTranscriptEndpoint")) return;
	              let match;
	              while ((match = regex.exec(text)) !== null) {
	                const rawParam = decodeScriptParam(String(match[1] || ""));
	                pushParams(rawParam, `script_${index}`);
	              }
	            });

	            return out.slice(0, 16);
	          };

	          const pushInnertubeStatus = (status) => {
	            const numeric = Number(status);
	            if (!Number.isFinite(numeric) || numeric <= 0) return;
	            if (!debug.innertubeHttpStatuses.includes(numeric)) {
	              debug.innertubeHttpStatuses.push(numeric);
	            }
	            if (debug.innertubeHttpStatuses.length > 8) {
	              debug.innertubeHttpStatuses = debug.innertubeHttpStatuses.slice(-8);
	            }
	          };

	          const readInnertubeConfig = () => {
	            const ytcfg = window.ytcfg;
	            let apiKey = "";
	            let context = null;
	            let clientVersion = "";
	            let clientNameId = "";
	            let visitorData = "";

	            if (ytcfg && typeof ytcfg.get === "function") {
	              apiKey = String(ytcfg.get("INNERTUBE_API_KEY") || "").trim();
	              context = ytcfg.get("INNERTUBE_CONTEXT") || null;
	              clientVersion = String(ytcfg.get("INNERTUBE_CLIENT_VERSION") || "").trim();
	              clientNameId = String(ytcfg.get("INNERTUBE_CONTEXT_CLIENT_NAME") || "").trim();
	              visitorData = String(ytcfg.get("VISITOR_DATA") || "").trim();
	            }

	            const rawData = ytcfg && typeof ytcfg === "object" ? ytcfg.data_ : null;
	            if (!apiKey && rawData) {
	              apiKey = String(rawData.INNERTUBE_API_KEY || "").trim();
	            }
	            if (!context && rawData?.INNERTUBE_CONTEXT) {
	              context = rawData.INNERTUBE_CONTEXT;
	            }
	            if (!clientVersion && rawData) {
	              clientVersion = String(rawData.INNERTUBE_CLIENT_VERSION || "").trim();
	            }
	            if (!clientNameId && rawData) {
	              clientNameId = String(rawData.INNERTUBE_CONTEXT_CLIENT_NAME || "").trim();
	            }
	            if (!visitorData && rawData) {
	              visitorData = String(rawData.VISITOR_DATA || "").trim();
	            }

	            let normalizedContext = null;
	            if (context && typeof context === "object") {
	              try {
	                normalizedContext = JSON.parse(JSON.stringify(context));
	              } catch {
	                normalizedContext = null;
	              }
	            }
	            if (!normalizedContext) {
	              normalizedContext = {
	                client: {
	                  clientName: "WEB",
	                  clientVersion: clientVersion || "",
	                },
	              };
	            }

	            return {
	              apiKey,
	              context: normalizedContext,
	              clientVersion: String(clientVersion || "").trim(),
	              clientNameId: String(clientNameId || "1").trim() || "1",
	              visitorData: String(visitorData || "").trim(),
	            };
	          };

		          const tryFetchTranscriptByInnertubeParams = async () => {
		            debug.innertubeProbeTried = true;
		            const paramsCandidates = collectTranscriptParamsCandidatesFromModels();
	            debug.innertubeParamCount = paramsCandidates.length;
	            if (!paramsCandidates.length) return null;

	            const config = readInnertubeConfig();
	            if (!config.apiKey || !config.context || !config.clientVersion) {
	              return null;
	            }
	            const endpoint = `/youtubei/v1/get_transcript?prettyPrint=false&key=${encodeURIComponent(
	              config.apiKey
	            )}`;

		            for (const paramsCandidate of paramsCandidates) {
		              try {
	                const headers = {
	                  "content-type": "application/json",
	                  "x-youtube-client-name": String(config.clientNameId || "1"),
	                  "x-youtube-client-version": String(config.clientVersion || ""),
	                  "x-origin": "https://www.youtube.com",
	                  origin: "https://www.youtube.com",
	                  referer: window.location.href,
	                };
	                if (config.visitorData) {
	                  headers["x-goog-visitor-id"] = String(config.visitorData);
	                }
		                selfProbeFetchDepth += 1;
		                const response = await fetch(endpoint, {
		                  method: "POST",
		                  credentials: "include",
		                  headers,
		                  body: JSON.stringify({
		                    context: config.context,
		                    params: paramsCandidate.params,
		                  }),
		                }).finally(() => {
		                  selfProbeFetchDepth = Math.max(0, selfProbeFetchDepth - 1);
		                });
		                pushInnertubeStatus(response.status);
		                if (!response.ok) continue;

	                const body = await response.text();
	                const parsed = parseTranscriptBody(body);
	                if (parsed?.timeline?.length) {
	                  debug.innertubeMatchedSource = String(paramsCandidate.source || "");
	                  debug.innertubeMatchedTimelineCount = parsed.timeline.length;
	                  return parsed;
	                }
		              } catch {
		                // Ignore single candidate failures.
		                selfProbeFetchDepth = Math.max(0, selfProbeFetchDepth - 1);
		              }
		            }
		            return null;
		          };

          const transcriptRootSelector =
            "ytd-transcript-segment-list-renderer, ytd-transcript-body-renderer, ytd-transcript-renderer, ytd-transcript-search-panel-renderer, ytd-engagement-panel-section-list-renderer[target-id*='transcript']";

	          const readTranscriptSurfaceState = () => {
              const roots = Array.from(document.querySelectorAll(transcriptRootSelector)).slice(
                0,
                24
              );
              const visibleRoots = roots.filter((root) => isElementVisible(root));
              const segmentRendererCount = document.querySelectorAll(
                "ytd-transcript-segment-renderer"
              ).length;
              const expandedPanelCount = Array.from(
                document.querySelectorAll(
                  "ytd-engagement-panel-section-list-renderer[target-id*='transcript']"
                )
              ).filter((panel) => {
                const visibility = normalizeLabel(panel?.getAttribute("visibility"));
                if (visibility.includes("expanded")) return true;
                if (panel?.hasAttribute("opened")) return true;
                return isElementVisible(panel);
              }).length;
              const transcriptTagCount = document.querySelectorAll(
                "[target-id*='transcript'], ytd-transcript-renderer, ytd-transcript-body-renderer, ytd-transcript-search-panel-renderer"
              ).length;
              const domParsed = parseTranscriptFromPanelDom();
              const domTimelineCount = Number(domParsed?.timeline?.length || 0);
              const ready =
                domTimelineCount > 0 ||
                segmentRendererCount > 0 ||
                visibleRoots.length > 0 ||
                expandedPanelCount > 0;
              return {
                ready,
                rootCount: roots.length,
                visibleRootCount: visibleRoots.length,
                segmentRendererCount,
                expandedPanelCount,
                transcriptTagCount,
                domTimelineCount,
              };
            };

            const waitForTranscriptSurfaceReady = async (waitMs) => {
              const budget = Number.isFinite(waitMs)
                ? Math.max(180, Math.min(1800, Number(waitMs)))
                : retryMode
                ? 980
                : 820;
              const started = now();
              let lastState = readTranscriptSurfaceState();
              if (lastState.ready) {
                return { ready: true, waitedMs: 0, state: lastState };
              }
              while (now() - started < budget) {
                await sleep(110);
                lastState = readTranscriptSurfaceState();
                if (lastState.ready) {
                  return {
                    ready: true,
                    waitedMs: now() - started,
                    state: lastState,
                  };
                }
              }
              return {
                ready: false,
                waitedMs: now() - started,
                state: lastState,
              };
            };

          const findDirectTranscriptButtons = () => {
            const scopes = [
              document.querySelector("ytd-video-description-transcript-section-renderer"),
              document.querySelector("ytd-watch-metadata"),
              document.querySelector("#description"),
              document.querySelector("ytd-engagement-panel-title-header-renderer"),
              document.querySelector("ytd-watch-flexy"),
              document,
            ].filter(Boolean);
            const selector =
              "button, tp-yt-paper-button, ytd-button-renderer button, yt-button-shape button, [role='button'], a[role='button'], [role='tab'], a[role='tab'], tp-yt-paper-tab, [aria-controls*='transcript']";
            const buttons = [];
            for (const scope of scopes) {
              const list = Array.from(scope.querySelectorAll(selector));
              list.forEach((button) => {
                if (!isElementVisible(button)) return;
                buttons.push(button);
              });
              const matched = buttons.filter((button) =>
                isTranscriptActionLabel(readNodeText(button))
              );
              if (matched.length > 0) {
                return dedupeElements(matched);
              }
            }
            return dedupeElements(buttons);
          };

          const findTranscriptTabButtons = () => {
            const selectors = [
              "[role='tab']",
              "a[role='tab']",
              "tp-yt-paper-tab",
              "yt-tab-shape button",
              "yt-chip-cloud-chip-renderer button",
              "[aria-controls*='transcript']",
            ];
            const out = [];
            selectors.forEach((selector) => {
              const list = Array.from(document.querySelectorAll(selector));
              list.forEach((node) => {
                if (!isElementVisible(node)) return;
                if (node.closest("ytd-player")) return;
                if (node.closest("#movie_player")) return;
                if (!isTranscriptTabElement(node)) return;
                out.push(node);
              });
            });
            return dedupeElements(out);
          };

          const findOverflowMenuButtons = () => {
            const scopes = [
              document.querySelector("ytd-watch-metadata"),
              document.querySelector("#description"),
            ].filter(Boolean);
            if (!scopes.length) scopes.push(document);
            const selectors = [
              "#description ytd-menu-renderer button",
              "ytd-watch-metadata ytd-menu-renderer button",
              "ytd-menu-renderer button",
            ];
            const candidates = [];
            scopes.forEach((scope) => {
              selectors.forEach((selector) => {
                const list = Array.from(scope.querySelectorAll(selector));
                list.forEach((button) => {
                  if (!isElementVisible(button)) return;
                  if (button.closest("ytd-player")) return;
                  if (button.closest("#movie_player")) return;
                  candidates.push(button);
                });
              });
            });
            return dedupeElements(
              candidates.filter((button) => isMenuButtonLabel(readNodeText(button)))
            );
          };

          const waitForMenuPopup = async (waitMs) => {
            const start = now();
            while (now() - start < waitMs) {
              const dropdown =
                document.querySelector("tp-yt-iron-dropdown[opened]") ||
                document.querySelector("tp-yt-iron-dropdown[aria-hidden='false']");
              const popupFromDropdown =
                dropdown?.querySelector("ytd-menu-popup-renderer") ||
                dropdown?.querySelector("tp-yt-paper-listbox");
              const popup =
                popupFromDropdown ||
                document.querySelector("ytd-popup-container ytd-menu-popup-renderer") ||
                document.querySelector("ytd-menu-popup-renderer") ||
                document.querySelector("tp-yt-paper-listbox");
              if (popup) return popup;
              await sleep(100);
            }
            return null;
          };

          const closeOpenMenus = () => {
            document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
            document.body.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape" }));
          };

          const clickDirectTranscriptButton = async (pathValue = "direct_clicked") => {
            const buttons = findDirectTranscriptButtons();
            let lastFailure = null;
            for (const button of buttons) {
              if (!isElementVisible(button)) continue;
              if (button.closest("ytd-player")) continue;
              if (button.closest("#movie_player")) continue;
              const label = normalizeLabel(readNodeText(button));
              if (!isTranscriptActionLabel(label)) continue;
              button.click();
              await sleep(120);
              const verification = await waitForTranscriptSurfaceReady();
              if (verification.ready) {
                return {
                  ok: true,
                  path: pathValue,
                  verified: true,
                  clickedLabel: label,
                  surface: verification.state,
                  waitedMs: verification.waitedMs,
                };
              }
              lastFailure = {
                ok: false,
                path: pathValue,
                error: "capture_entry_not_effective",
                verified: false,
                clickedLabel: label,
                surface: verification.state,
                waitedMs: verification.waitedMs,
              };
            }
            return (
              lastFailure || {
                ok: false,
                path: pathValue,
                error: "capture_entry_not_found",
              }
            );
          };

          const clickTranscriptTab = async () => {
            const tabs = findTranscriptTabButtons();
            let lastFailure = null;
            for (const tab of tabs) {
              if (!isElementVisible(tab)) continue;
              const label = normalizeLabel(readNodeText(tab));
              if (!isTranscriptTabElement(tab)) continue;
              tab.click();
              await sleep(120);
              const verification = await waitForTranscriptSurfaceReady(1450);
              if (verification.ready) {
                return {
                  ok: true,
                  path: "tab_clicked",
                  verified: true,
                  clickedLabel: label,
                  surface: verification.state,
                  waitedMs: verification.waitedMs,
                };
              }
              lastFailure = {
                ok: false,
                path: "tab_clicked",
                error: "capture_entry_not_effective",
                verified: false,
                clickedLabel: label,
                surface: verification.state,
                waitedMs: verification.waitedMs,
              };
            }
            return (
              lastFailure || {
                ok: false,
                path: "tab_clicked",
                error: "capture_entry_not_found",
              }
            );
          };

          const clickTranscriptMenuItem = async () => {
            const menuButtons = findOverflowMenuButtons();
            let lastFailure = null;
            for (const button of menuButtons) {
              if (!isElementVisible(button)) continue;
              closeOpenMenus();
              button.click();
              const menu = await waitForMenuPopup(1200);
              if (!menu) continue;
              const items = Array.from(
                menu.querySelectorAll(
                  "ytd-menu-service-item-renderer, tp-yt-paper-item, ytd-menu-navigation-item-renderer"
                )
              );
              const target = items.find((item) =>
                isTranscriptActionLabel(readNodeText(item))
              );
              if (!target) {
                closeOpenMenus();
                continue;
              }
              target.click();
              await sleep(120);
              const verification = await waitForTranscriptSurfaceReady();
              if (verification.ready) {
                return {
                  ok: true,
                  path: "menu_clicked",
                  verified: true,
                  clickedLabel: normalizeLabel(readNodeText(target)),
                  surface: verification.state,
                  waitedMs: verification.waitedMs,
                };
              }
              lastFailure = {
                ok: false,
                path: "menu_clicked",
                error: "capture_entry_not_effective",
                verified: false,
                clickedLabel: normalizeLabel(readNodeText(target)),
                surface: verification.state,
                waitedMs: verification.waitedMs,
              };
            }
            return (
              lastFailure || {
                ok: false,
                path: "menu_clicked",
                error: "capture_entry_not_found",
              }
            );
          };

          const expandDescriptionIfNeeded = async () => {
            const container =
              document.querySelector("ytd-watch-metadata") ||
              document.querySelector("#description");
            if (!container) return false;
            const selectors = [
              "button#expand",
              "tp-yt-paper-button#expand",
              "yt-button-shape button#expand",
              "button[aria-label*='Show more']",
              "button[aria-label*='展开']",
              "button[aria-label*='更多']",
            ];
            for (const selector of selectors) {
              const button = container.querySelector(selector);
              if (!button || !isElementVisible(button)) continue;
              if (button.getAttribute("aria-expanded") === "true") continue;
              button.click();
              await sleep(120);
              return true;
            }
            return false;
          };

	          const openTranscriptEntry = async () => {
            const initialSurface = readTranscriptSurfaceState();
            if (initialSurface.ready) {
              return {
                ok: true,
                path: "already_open",
                verified: true,
                clickedLabel: "",
                surface: initialSurface,
                waitedMs: 0,
              };
            }
            const warmup = await waitForTranscriptSurfaceReady(retryMode ? 820 : 620);
            if (warmup.ready) {
              return {
                ok: true,
                path: "already_open_wait",
                verified: true,
                clickedLabel: "",
                surface: warmup.state,
                waitedMs: warmup.waitedMs,
              };
            }
            if (!allowOpen) {
              return {
                ok: true,
                path: "skip_open",
                verified: false,
                clickedLabel: "",
                surface: warmup.state || initialSurface,
                waitedMs: warmup.waitedMs || 0,
              };
            }
            let lastFailure = null;

            const tabResult = await clickTranscriptTab();
            if (tabResult?.ok) {
              return tabResult;
            }
            if (tabResult?.error) lastFailure = tabResult;

            const directResult = await clickDirectTranscriptButton("direct_clicked");
            if (directResult?.ok) {
              return directResult;
            }
            if (directResult?.error) lastFailure = directResult;

            const expanded = await expandDescriptionIfNeeded();
            if (expanded) {
              const expandedResult = await clickDirectTranscriptButton("expand_then_direct");
              if (expandedResult?.ok) {
                return expandedResult;
              }
              if (expandedResult?.error) lastFailure = expandedResult;
            }
            const menuResult = await clickTranscriptMenuItem();
            if (menuResult?.ok) {
              return menuResult;
            }
            if (menuResult?.error) lastFailure = menuResult;

            closeOpenMenus();
            if (lastFailure?.error === "capture_entry_not_effective") {
              return lastFailure;
            }
	            return { ok: false, path: "none", error: "capture_entry_not_found" };
	          };

	          const nudgeTranscriptPanelForRetry = async () => {
	            debug.retryNudgeTried = true;
	            const panel = document.querySelector(
	              "ytd-transcript-segment-list-renderer, ytd-transcript-body-renderer, ytd-transcript-renderer, ytd-transcript-search-panel-renderer, ytd-engagement-panel-section-list-renderer[target-id*='transcript']"
	            );
	            if (!panel || !isElementVisible(panel)) {
	              return false;
	            }
	            const scrollTarget =
	              panel.querySelector(
	                "#segments-container, #segments, #body, .segment-list, [id*='segments']"
	              ) || panel;
	            try {
	              if (
	                scrollTarget &&
	                Number(scrollTarget.scrollHeight || 0) >
	                  Number(scrollTarget.clientHeight || 0) + 20
	              ) {
	                const originalTop = Number(scrollTarget.scrollTop || 0);
	                scrollTarget.scrollTop = Math.max(
	                  0,
	                  Number(scrollTarget.scrollHeight || 0) -
	                    Number(scrollTarget.clientHeight || 0)
	                );
	                await sleep(90);
	                scrollTarget.scrollTop = originalTop;
	                await sleep(60);
	                debug.retryNudgeScrolled = true;
	              }
	            } catch {
	              // Ignore scroll probe failures.
	            }
	            return true;
	          };

          let settled = false;
          let resolveDone = null;
          const donePromise = new Promise((resolveDonePromise) => {
            resolveDone = resolveDonePromise;
          });
          const startedAt = now();
          const settle = (value) => {
            if (settled) return;
            settled = true;
            debug.elapsedMs = now() - startedAt;
            resolveDone(value);
          };

				          const evaluateFailure = (openResult) => {
                const openError = String(openResult?.error || "");
                const openPath = String(openResult?.path || "");
                const alreadyOpenPath =
                  openPath === "preopen_model" || openPath.startsWith("already_open");
	            const pageHttpStatus = debug.pageNativeStatuses.find((status) => status >= 400);
	            if (pageHttpStatus) {
	              return `capture_http_${pageHttpStatus}`;
	            }
	            if (debug.pageNativeResponseCount === 0) {
                  if (openError === "capture_entry_not_found" && alreadyOpenPath) {
                    return "capture_schema_unmatched";
                  }
                  if (allowOpen && debug.openAttempted && !debug.openVerified) {
                    return "capture_entry_not_effective";
                  }
                  if (debug.innertubeProbeTried && debug.innertubeParamCount > 0) {
                    return "capture_schema_unmatched";
                  }
                  if (
                    debug.modelProbeCount > 0 &&
                    (debug.modelCandidateCount > 0 || debug.domProbeTimelineCount > 0)
                  ) {
                    return "capture_schema_unmatched";
                  }
                  if (
                    openError === "capture_entry_not_effective" ||
                    openError === "capture_entry_not_found"
                  ) {
                    return openError;
                  }
                  if (openError) return openError;
                  return "capture_request_not_observed";
	            }
	            const hasPageNonEmpty = debug.pageNativeRequests.some(
	              (item) => Number(item?.payloadLength || 0) > 0
	            );
	            if (!hasPageNonEmpty) {
	              return "capture_empty_body";
	            }
	            return "capture_schema_unmatched";
	          };

          const originalFetch = window.fetch;
          const originalXhrOpen = XMLHttpRequest.prototype.open;
          const originalXhrSend = XMLHttpRequest.prototype.send;
	          const onResponse = (raw) => {
            const url = String(raw?.url || raw?.requestUrl || "");
            const requestUrl = String(raw?.requestUrl || "");
            if (!isTranscriptRequestUrl(url) && !isTranscriptRequestUrl(requestUrl)) {
              return;
            }
            debug.requestCount += 1;
            const status = Number(raw?.status || 0);
            const contentType = String(raw?.contentType || "");
            const body = String(raw?.body || "");
            const bodyPreview = normalizeText(body).slice(0, 140);
	            const item = {
	              status,
	              contentType,
	              payloadLength: body.length,
	              via: String(raw?.via || ""),
	              sourceTag: String(raw?.sourceTag || "page_native"),
	              bodyPreview,
	            };
	            pushRequest(item, item.sourceTag);
	            const parsed = parseTranscriptBody(body);
	            if (parsed?.timeline?.length && (!panelDomOnly || isPanelDomSource(parsed?.source))) {
	              settle({
	                ok: true,
	                data: buildCaptureData(parsed),
	                debug,
	              });
	            }
	          };
	          const trySettleFromPageState = () => {
	            const parsed = parseTranscriptFromPageModels();
	            if (!parsed?.timeline?.length) return false;
	            settle({
	              ok: true,
	              data: buildCaptureData(parsed),
	              debug,
	            });
	            return true;
	          };

	          try {
	            window.fetch = async function (...args) {
	              const requestUrl =
	                typeof args[0] === "string"
	                  ? args[0]
	                  : String(args[0]?.url || "");
	              const response = await originalFetch.apply(this, args);
	              try {
	                const responseUrl = String(response?.url || requestUrl || "");
	                if (isTranscriptRequestUrl(responseUrl) || isTranscriptRequestUrl(requestUrl)) {
	                  const cloned = response.clone();
	                  const body = await cloned.text();
	                  const sourceTag = selfProbeFetchDepth > 0 ? "self_probe" : "page_native";
	                  onResponse({
	                    url: responseUrl,
	                    requestUrl,
	                    status: Number(response.status) || 0,
	                    contentType: String(response.headers?.get("content-type") || ""),
	                    body,
	                    via: "fetch",
	                    sourceTag,
	                  });
	                }
	              } catch {
                // Ignore probe errors and keep original response flow.
              }
              return response;
            };

            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
              this.__viTranscriptUrl = String(url || "");
              return originalXhrOpen.call(this, method, url, ...rest);
            };
            XMLHttpRequest.prototype.send = function (...args) {
              const requestUrl = String(this.__viTranscriptUrl || "");
              if (isTranscriptRequestUrl(requestUrl)) {
                this.addEventListener(
                  "loadend",
                  () => {
                    try {
	                      onResponse({
	                        url: String(this.responseURL || requestUrl),
	                        requestUrl,
	                        status: Number(this.status) || 0,
	                        contentType: String(this.getResponseHeader("content-type") || ""),
	                        body: typeof this.responseText === "string" ? this.responseText : "",
	                        via: "xhr",
	                        sourceTag: "page_native",
	                      });
                    } catch {
                      // Ignore read errors.
                    }
                  },
                  { once: true }
                );
              }
              return originalXhrSend.apply(this, args);
            };

		            let openResult = {
                  ok: false,
                  path: "none",
                  error: "capture_entry_not_found",
                  verified: false,
                  clickedLabel: "",
                  surface: null,
                  waitedMs: 0,
                };
                if (!settled && trySettleFromPageState()) {
                  openResult = {
                    ok: true,
                    path: "preopen_model",
                    error: "",
                    verified: true,
                    clickedLabel: "",
                    surface: readTranscriptSurfaceState(),
                    waitedMs: 0,
                  };
                }
                if (!settled) {
		              openResult = await openTranscriptEntry();
                }
			            const openPathValue = String(openResult?.path || "");
			            const openTriggeredByExtension = [
			              "tab_clicked",
			              "direct_clicked",
			              "expand_then_direct",
			              "menu_clicked",
			            ].includes(openPathValue);
			            const panelReadyBeforeOpen =
			              openPathValue === "preopen_model" ||
			              openPathValue === "already_open" ||
			              openPathValue === "already_open_wait";
			            debug.openPath = openPathValue;
			            debug.openAttempted = openTriggeredByExtension;
			            debug.openTriggeredByExtension = openTriggeredByExtension;
			            debug.panelReadyBeforeOpen = panelReadyBeforeOpen;
			            debug.opened = Boolean(openResult?.ok && openTriggeredByExtension);
                debug.openVerified = Boolean(openResult?.verified);
                debug.openClickedLabel = String(openResult?.clickedLabel || "");
                debug.openVerificationWaitMs = Number(openResult?.waitedMs || 0);
                if (openResult?.surface && typeof openResult.surface === "object") {
                  debug.openSurface = {
                    rootCount: Number(openResult.surface.rootCount || 0),
                    visibleRootCount: Number(openResult.surface.visibleRootCount || 0),
                    segmentRendererCount: Number(openResult.surface.segmentRendererCount || 0),
                    expandedPanelCount: Number(openResult.surface.expandedPanelCount || 0),
                    transcriptTagCount: Number(openResult.surface.transcriptTagCount || 0),
                    domTimelineCount: Number(openResult.surface.domTimelineCount || 0),
                  };
                }
		            trySettleFromPageState();
		            if (!settled && retryMode) {
		              await sleep(120);
		              await nudgeTranscriptPanelForRetry();
		              trySettleFromPageState();
		            }
		            let innertubeProbePromise = null;
		            const innertubeGraceMs = retryMode ? 520 : 340;
		            const startInnertubeProbe = () => {
		              if (innertubeProbePromise) return;
		              innertubeProbePromise = (async () => {
	                const parsed = await tryFetchTranscriptByInnertubeParams();
	                if (!parsed?.timeline?.length || settled) return;
	                settle({
	                  ok: true,
	                  data: buildCaptureData(parsed),
	                  debug,
	                });
		              })().catch(() => {
		                // Ignore innertube probe errors.
		              });
		            };
		            const maybeStartInnertubeProbe = () => {
		              if (panelDomOnly || settled || debug.innertubeProbeTried) return;
		              const elapsed = now() - startedAt;
		              if (debug.pageNativeResponseCount === 0 && elapsed < innertubeGraceMs) return;
		              startInnertubeProbe();
		            };
		            maybeStartInnertubeProbe();
		            const probeTimer = setInterval(() => {
		              if (settled) return;
		              try {
		                trySettleFromPageState();
		                maybeStartInnertubeProbe();
		              } catch {
		                // Ignore model probe failures and keep capture flow alive.
		              }
	            }, 240);

	            const timeoutTimer = setTimeout(() => {
	              debug.timedOut = true;
	              clearInterval(probeTimer);
	              settle({
	                ok: false,
	                error: evaluateFailure(openResult),
	                debug,
	              });
	            }, timeout);

	            const done = await donePromise;
	            clearTimeout(timeoutTimer);
	            clearInterval(probeTimer);
	            return done;
	          } finally {
            window.fetch = originalFetch;
            XMLHttpRequest.prototype.open = originalXhrOpen;
            XMLHttpRequest.prototype.send = originalXhrSend;
          }
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "execute_script_failed"));
          return;
        }
        const result = results?.[0]?.result;
        if (!result || typeof result !== "object") {
          reject(new Error("empty_execute_result"));
          return;
        }
        resolve(result);
      }
    );
  });
}

async function fetchTranscriptWithFallback(tabInfo, options = {}) {
  const allowDomPanelOpen = options?.allowDomPanelOpen !== false;
  const mode =
    options?.mode === "manual"
      ? "manual"
      : options?.mode === "open"
      ? "open"
      : "auto";
  const activeStrategy = getActiveTranscriptStrategy();
  const ytPanelTranscriptOnly = activeStrategy === CHANNEL_YT_PANEL_TRANSCRIPT;
  const ytTimedtextOnly = activeStrategy === CHANNEL_YT_TIMEDTEXT;
  const ytTimedtextThenPanelOnly =
    activeStrategy === TRANSCRIPT_STRATEGY_TIMEDTEXT_THEN_PANEL;
  addDiagStep("FALLBACK_CHAIN", "start", {
    videoId: tabInfo?.videoId || "",
    allowDomPanelOpen,
    strategy: activeStrategy,
  });
  const captureModeKey =
    mode === "manual" ? "manual" : mode === "open" ? "open" : "auto";
  const captureTimeoutMs = Number(PRIMARY_CAPTURE_TIMEOUT_MS[captureModeKey] || 5600);
  const captureMaxAttempts = Number(PRIMARY_CAPTURE_MAX_ATTEMPTS[captureModeKey] || 1);

  const primaryErrors = [];
  let primaryTranscriptDegraded = null;
  let captionMeta = null;
  let voiceInsightApiError = null;
  const rememberPrimaryError = (error) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    primaryErrors.push(normalized);
    return normalized;
  };
  const latestPrimaryError = () =>
    primaryErrors.length > 0 ? primaryErrors[primaryErrors.length - 1] : null;

  const runPrimaryCaptureStage = async ({
    path,
    allowOpenPanel,
    maxAttempts,
    captureTimeoutMs: stageCaptureTimeoutMs = captureTimeoutMs,
    attemptOffset = 0,
  }) => {
    const boundedAttempts = Number.isFinite(maxAttempts)
      ? Math.max(1, Math.min(4, Number(maxAttempts)))
      : 1;
    let dynamicMaxAttempts = boundedAttempts;
    let lowQualityRetried = false;
    for (let attempt = 1; attempt <= dynamicMaxAttempts; attempt += 1) {
      const effectiveAttempt = attempt + Math.max(0, Number(attemptOffset) || 0);
      try {
        const transcript = await fetchTranscriptByPrimaryCapture(tabInfo, {
          allowDomPanelOpen: allowOpenPanel,
          attempt: effectiveAttempt,
          timeoutMs: stageCaptureTimeoutMs,
        });
        const quality = assessPrimaryTranscriptQuality(transcript);
        if (!quality.shouldFallback) {
          addDiagStep("FALLBACK_CHAIN", "ok", {
            path,
            attempt: effectiveAttempt,
          });
          return transcript;
        }
        primaryTranscriptDegraded = transcript;
        const qualityError = rememberPrimaryError(
          new Error(`capture_low_quality_${quality.reason || "unknown"}`)
        );
        if (!lowQualityRetried) {
          lowQualityRetried = true;
          dynamicMaxAttempts = Math.min(4, dynamicMaxAttempts + 1);
          addDiagStep("FALLBACK_CHAIN", "retry", {
            path,
            attempt: effectiveAttempt,
            error: errorToMessage(qualityError),
            quality,
            lowQualityRetry: true,
          });
        } else {
          // Retry-once policy: if low quality persists, return what we have instead of discarding it.
          addDiagStep("FALLBACK_CHAIN", "ok", {
            path,
            attempt: effectiveAttempt,
            qualityAccepted: true,
            quality,
          });
          return transcript;
        }
      } catch (error) {
        const captureError = rememberPrimaryError(error);
        addDiagStep("FALLBACK_CHAIN", "retry", {
          path,
          attempt: effectiveAttempt,
          error: errorToMessage(captureError),
        });
      }

      const currentError = latestPrimaryError();
      if (attempt >= dynamicMaxAttempts || isContextGateError(currentError)) {
        break;
      }
      await sleep(320);
      try {
        await ensureMainWorldVideoContextReady(tabInfo, {
          stage: "CONTEXT_GATE_RETRY",
          timeoutMs: 5200,
          stableMs: 560,
        });
      } catch (retryGateError) {
        rememberPrimaryError(retryGateError);
        break;
      }
    }
    return null;
  };

  if (!(ytTimedtextOnly || ytTimedtextThenPanelOnly)) {
    try {
      await ensureMainWorldVideoContextReady(tabInfo, {
        stage: "CONTEXT_GATE",
        timeoutMs: CONTEXT_GATE_TIMEOUT_MS,
        stableMs: CONTEXT_GATE_STABLE_MS,
      });
    } catch (contextError) {
      const normalizedContextError = rememberPrimaryError(contextError);
      addDiagStep("FALLBACK_CHAIN", "error", {
        path: "PRIMARY_CONTEXT_GATE",
        error: errorToMessage(normalizedContextError),
        selectedError: errorToMessage(normalizedContextError),
      });
      throw normalizedContextError;
    }
  } else {
    addDiagStep("CONTEXT_GATE", "retry", {
      reason: ytTimedtextOnly
        ? "skip_for_timedtext_only"
        : "skip_for_timedtext_then_panel",
    });
  }

  if (ytPanelTranscriptOnly) {
    const panelTranscript = await runPrimaryCaptureStage({
      path: CHANNEL_YT_PANEL_TRANSCRIPT,
      allowOpenPanel: allowDomPanelOpen,
      maxAttempts: Math.max(1, captureMaxAttempts),
      captureTimeoutMs: Math.max(captureTimeoutMs, 6200),
      attemptOffset: 0,
    });
    if (panelTranscript) {
      return panelTranscript;
    }
    const selectedError =
      selectPrimaryFallbackError(primaryErrors) ||
      latestPrimaryError() ||
      new Error("capture_schema_unmatched");
    addDiagStep("FALLBACK_CHAIN", "retry", {
      path: CHANNEL_YT_PANEL_TRANSCRIPT,
      error: errorToMessage(selectedError),
      nextStep: "none",
    });
    addDiagStep("FALLBACK_CHAIN", "error", {
      path: CHANNEL_YT_PANEL_TRANSCRIPT,
      error: errorToMessage(selectedError),
      selectedError: errorToMessage(selectedError),
    });
    throw selectedError;
  }

  if (ytTimedtextOnly) {
    try {
      const timedtextTranscript = await fetchTranscriptFromTimedtextList(tabInfo);
      addDiagStep("FALLBACK_CHAIN", "ok", {
        path: CHANNEL_YT_TIMEDTEXT,
      });
      return timedtextTranscript;
    } catch (timedtextError) {
      const normalizedTimedtextError = rememberPrimaryError(timedtextError);
      addDiagStep("FALLBACK_CHAIN", "retry", {
        path: CHANNEL_YT_TIMEDTEXT,
        error: errorToMessage(normalizedTimedtextError),
        nextStep: "none",
      });
      addDiagStep("FALLBACK_CHAIN", "error", {
        path: CHANNEL_YT_TIMEDTEXT,
        error: errorToMessage(normalizedTimedtextError),
        selectedError: errorToMessage(normalizedTimedtextError),
      });
      throw normalizedTimedtextError;
    }
  }

  if (ytTimedtextThenPanelOnly) {
    try {
      const timedtextTranscript = await fetchTranscriptFromTimedtextList(tabInfo);
      addDiagStep("FALLBACK_CHAIN", "ok", {
        path: CHANNEL_YT_TIMEDTEXT,
      });
      return timedtextTranscript;
    } catch (timedtextError) {
      const normalizedTimedtextError = rememberPrimaryError(timedtextError);
      addDiagStep("FALLBACK_CHAIN", "retry", {
        path: CHANNEL_YT_TIMEDTEXT,
        error: errorToMessage(normalizedTimedtextError),
        nextStep: CHANNEL_YT_PANEL_TRANSCRIPT,
      });
    }

    const panelTranscript = await runPrimaryCaptureStage({
      path: CHANNEL_YT_PANEL_TRANSCRIPT,
      allowOpenPanel: allowDomPanelOpen,
      maxAttempts: Math.max(1, captureMaxAttempts),
      captureTimeoutMs: Math.max(captureTimeoutMs, 6200),
      attemptOffset: 0,
    });
    if (panelTranscript) {
      return panelTranscript;
    }

    const selectedError =
      selectPrimaryFallbackError(primaryErrors) ||
      latestPrimaryError() ||
      new Error("captions_not_found");
    addDiagStep("FALLBACK_CHAIN", "retry", {
      path: CHANNEL_YT_PANEL_TRANSCRIPT,
      error: errorToMessage(selectedError),
      nextStep: "none",
    });
    addDiagStep("FALLBACK_CHAIN", "error", {
      path: CHANNEL_YT_PANEL_TRANSCRIPT,
      error: errorToMessage(selectedError),
      selectedError: errorToMessage(selectedError),
    });
    throw selectedError;
  }

  try {
    captionMeta = await prefetchCaptionTrackMetadata(tabInfo);
  } catch (metaError) {
    const normalizedMetaError =
      metaError instanceof Error ? metaError : new Error(String(metaError));
    addDiagStep("FALLBACK_CHAIN", "retry", {
      path: "VOICEINSIGHT_META",
      error: errorToMessage(normalizedMetaError),
    });
  }

  try {
    const transcript = await fetchTranscriptFromVoiceInsightApi(tabInfo, {
      captionMeta,
      mode,
    });
    addDiagStep("FALLBACK_CHAIN", "ok", {
      path: "VOICEINSIGHT_API",
      source: String(transcript?.source || transcript?.engine || ""),
      engine: String(transcript?.engine || ""),
    });
    return transcript;
  } catch (apiError) {
    voiceInsightApiError = apiError instanceof Error ? apiError : new Error(String(apiError));
    addDiagStep("FALLBACK_CHAIN", "retry", {
      path: "VOICEINSIGHT_API",
      error: errorToMessage(voiceInsightApiError),
    });
  }

  if (!captionMeta) {
    try {
      captionMeta = await prefetchCaptionTrackMetadata(tabInfo);
    } catch (metaError) {
      const normalizedMetaError = rememberPrimaryError(metaError);
      addDiagStep("FALLBACK_CHAIN", "retry", {
        path: "PRIMARY_TRACK_META",
        error: errorToMessage(normalizedMetaError),
      });
    }
  }

  const preferredLanguage = state.locale === "zh" ? "zh" : "en";
  let preferOpenCapture = false;
  try {
    const transcript = await fetchTranscriptFromCaptionTrack(tabInfo, {
      captionMeta,
      preferredLanguage,
      stagePrefix: "PRIMARY_TRACKS",
    });
    addDiagStep("FALLBACK_CHAIN", "ok", {
      path: "PRIMARY_TRACKS",
    });
    return transcript;
  } catch (trackError) {
    const normalizedTrackError = rememberPrimaryError(trackError);
    const trackMessage = String(errorToMessage(normalizedTrackError) || "").toLowerCase();
    preferOpenCapture =
      trackMessage.includes("timedtext_html_empty") ||
      trackMessage.includes("timedtext_empty_after_caption_track");
    addDiagStep("FALLBACK_CHAIN", "retry", {
      path: "PRIMARY_TRACKS",
      error: errorToMessage(normalizedTrackError),
    });
  }

  if (!preferOpenCapture) {
    try {
      const transcript = await fetchTranscriptFromTimedtextList(tabInfo);
      addDiagStep("FALLBACK_CHAIN", "ok", {
        path: "PRIMARY_TIMEDTEXT_LIST",
      });
      return transcript;
    } catch (timedtextError) {
      const normalizedTimedtextError = rememberPrimaryError(timedtextError);
      addDiagStep("FALLBACK_CHAIN", "retry", {
        path: "PRIMARY_TIMEDTEXT_LIST",
        error: errorToMessage(normalizedTimedtextError),
      });
    }
  } else {
    addDiagStep("FALLBACK_CHAIN", "retry", {
      path: "PRIMARY_TIMEDTEXT_LIST",
      error: "skip_due_timedtext_html_empty",
    });
  }

  if (preferOpenCapture && allowDomPanelOpen) {
    const quickOpenTranscript = await runPrimaryCaptureStage({
      path: "PRIMARY_CAPTURE",
      allowOpenPanel: true,
      maxAttempts: captureMaxAttempts,
      captureTimeoutMs,
      attemptOffset: 0,
    });
    if (quickOpenTranscript) {
      return quickOpenTranscript;
    }
  } else {
    const noOpenTranscript = await runPrimaryCaptureStage({
      path: "PRIMARY_CAPTURE_NOOPEN",
      allowOpenPanel: false,
      maxAttempts: captureMaxAttempts,
      captureTimeoutMs,
      attemptOffset: 0,
    });
    if (noOpenTranscript) {
      return noOpenTranscript;
    }

    if (allowDomPanelOpen) {
      const openTranscript = await runPrimaryCaptureStage({
        path: "PRIMARY_CAPTURE",
        allowOpenPanel: true,
        maxAttempts: 1,
        captureTimeoutMs,
        attemptOffset: 2,
      });
      if (openTranscript) {
        return openTranscript;
      }
    }
  }

  const primaryCaptureError = latestPrimaryError();

  if (isContextGateError(primaryCaptureError)) {
    addDiagStep("FALLBACK_CHAIN", "error", {
      path: "PRIMARY_CAPTURE",
      error: errorToMessage(primaryCaptureError),
      selectedError: errorToMessage(primaryCaptureError),
    });
    throw primaryCaptureError;
  }

  if (primaryTranscriptDegraded) {
    addDiagStep("FALLBACK_CHAIN", "ok", {
      path: "PRIMARY_CAPTURE_DEGRADED",
      reason: voiceInsightApiError ? "api_fallback_failed" : "primary_low_quality",
    });
    return primaryTranscriptDegraded;
  }

  const selectedError = selectPrimaryFallbackError([
    ...primaryErrors,
    voiceInsightApiError,
  ]);
  const finalError =
    selectedError ||
    primaryCaptureError ||
    voiceInsightApiError ||
    new Error("captions_not_found");
  addDiagStep("FALLBACK_CHAIN", "error", {
    path: "PRIMARY_CAPTURE",
    error: errorToMessage(finalError),
    selectedError: errorToMessage(finalError),
  });
  throw finalError;
}

function selectPrimaryFallbackError(errors) {
  const list = Array.isArray(errors) ? errors.filter(Boolean) : [];
  if (list.length === 0) return null;

  const messageOf = (error) => String(error?.message || "").toLowerCase();
  const nonSoft = list.filter(
    (error) => !messageOf(error).includes("transcript_panel_not_open")
  );
  const pool = nonSoft.length > 0 ? nonSoft : list;
  const priorityMatchers = [
    /context_url_mismatch|context_mismatch|context_not_ready/i,
    /capture_http_|capture_request_not_observed|capture_empty_body|capture_schema_unmatched|capture_entry_not_effective|capture_entry_not_found/i,
    /innertube_params_missing|innertube_context_missing|innertube_http_|innertube_schema_unmatched|innertube_transcript_unavailable/i,
    /third_party_/i,
    /caption_track_missing_url|timedtext_html_empty|timedtext_empty_after_caption_track|no_caption_tracks|captions_not_found|transcript_panel_not_found|transcript_entry_not_found|transcript_entry_clicked_but_no_text|transcript_empty|transcript_unavailable|player_response_not_found|player_response_mismatch/i,
    /transcript_panel_not_open/i,
  ];

  for (const matcher of priorityMatchers) {
    const found = pool.find((error) => matcher.test(messageOf(error)));
    if (found) return found;
  }
  return pool[pool.length - 1];
}

async function prefetchCaptionTrackMetadata(tabInfo) {
  addDiagStep("CAPTION_META", "start", {
    videoId: tabInfo?.videoId || "",
  });
  const preferredLanguage = state.locale === "zh" ? "zh" : "en";
  const metadata = await requestCaptionsWithRetry(
    tabInfo.tabId,
    preferredLanguage,
    tabInfo.videoId,
    {
      stage: "GET_CAPTIONS_META",
      maxAttempts: 2,
    }
  );
  addDiagStep("CAPTION_META", "ok", {
    trackCount: Number(metadata?.trackCount || 0),
    selectedBy: String(metadata?.selectedBy || ""),
    selectedLanguageCode: String(metadata?.track?.languageCode || ""),
    activeLanguageCode: String(metadata?.activeTrack?.languageCode || ""),
  });
  return metadata;
}

async function fetchTranscriptFromCaptionTrack(tabInfo, options = {}) {
  const stagePrefix = String(options?.stagePrefix || "CAPTION").trim().toUpperCase();
  const metaStage = `${stagePrefix}_META`;
  const trackStage = `${stagePrefix}_TRACK`;
  const preferredLanguage =
    typeof options?.preferredLanguage === "string" && options.preferredLanguage.trim()
      ? options.preferredLanguage.trim()
      : state.locale === "zh"
      ? "zh"
      : "en";

  addDiagStep("CAPTION_TRACK", "start", {
    videoId: tabInfo?.videoId || "",
    metaPrefetched: Boolean(options?.captionMeta),
    preferredLanguage,
    stagePrefix,
  });
  const rounds = [0, 260];
  let lastError = new Error("captions_not_found");

  for (let round = 0; round < rounds.length; round += 1) {
    const delay = rounds[round];
    if (delay > 0) {
      await sleep(delay);
    }

    let captionData = options?.captionMeta || null;
    if (!captionData?.track?.baseUrl || round > 0) {
      captionData = await requestCaptionsWithRetry(
        tabInfo.tabId,
        preferredLanguage,
        tabInfo.videoId,
        {
          stage: metaStage,
          maxAttempts: 2,
        }
      );
    } else {
      addDiagStep(trackStage, "ok", {
        stage: "reuse_meta",
        selectedBy: String(captionData?.selectedBy || ""),
        languageCode: String(captionData?.track?.languageCode || ""),
      });
    }

    const orderedTracks = orderCaptionTracksForExtraction(
      captionData,
      preferredLanguage
    );
    addDiagStep(trackStage, "start", {
      round: round + 1,
      trackCount: orderedTracks.length,
      selectedBy: String(captionData?.selectedBy || ""),
      selectedLanguageCode: String(captionData?.track?.languageCode || ""),
      activeLanguageCode: String(captionData?.activeTrack?.languageCode || ""),
    });

    if (!orderedTracks.length) {
      lastError = new Error("caption_track_missing_url");
      addDiagStep(trackStage, "retry", {
        round: round + 1,
        error: errorToMessage(lastError),
      });
      continue;
    }

    let htmlEmptyObservedInRound = false;
    for (let index = 0; index < orderedTracks.length; index += 1) {
      const track = orderedTracks[index];
      const formatOrder = getCaptionTrackFormatOrder(track);
      addDiagStep(trackStage, "start", {
        round: round + 1,
        trackIndex: index + 1,
        languageCode: String(track?.languageCode || ""),
        languageName: String(track?.name || ""),
        auto: Boolean(track?.isAutoGenerated),
      });
      const result = await fetchCaptionTimelineDetailed(track.baseUrl, tabInfo.tabId, {
        stage: `${stagePrefix}_TIMEDTEXT_FETCH`,
        formatOrder,
        htmlEmptyRetry: true,
      });
      if (result?.timeline?.length) {
        addDiagStep(trackStage, "ok", {
          round: round + 1,
          trackIndex: index + 1,
          languageCode: String(track?.languageCode || ""),
          auto: Boolean(track?.isAutoGenerated),
          timelineSize: result.timeline.length,
        });
        return {
          transcript: result.timeline.map((entry) => entry.text).join(" ").trim(),
          timeline: result.timeline,
          languageCode: track?.languageCode || "unknown",
          languageName: track?.name || "",
          isAutoGenerated: Boolean(track?.isAutoGenerated),
          title: String(captionData?.video?.title || tabInfo.title || "").trim(),
        };
      }

      addDiagStep(trackStage, "retry", {
        round: round + 1,
        trackIndex: index + 1,
        languageCode: String(track?.languageCode || ""),
        auto: Boolean(track?.isAutoGenerated),
        htmlEmptyObserved: Boolean(result?.htmlEmptyObserved),
        formatOrder: Array.isArray(formatOrder) ? formatOrder.join("->") : "",
      });
      if (result?.htmlEmptyObserved) {
        htmlEmptyObservedInRound = true;
      }
    }

    lastError = htmlEmptyObservedInRound
      ? new Error("timedtext_html_empty")
      : new Error("timedtext_empty_after_caption_track");
    addDiagStep(trackStage, "retry", {
      round: round + 1,
      error: errorToMessage(lastError),
    });
  }

  addDiagStep("CAPTION_TRACK", "error", {
    error: errorToMessage(lastError),
  });
  throw lastError;
}

async function fetchTranscriptFromTimedtextList(tabInfo) {
  addDiagStep("TIMEDTEXT_LIST", "start", {
    videoId: tabInfo?.videoId || "",
  });
  const videoId = String(tabInfo?.videoId || "").trim();
  if (!videoId) {
    throw new Error("captions_not_found");
  }
  const preferredLanguage = state.locale === "zh" ? "zh" : "en";
  const tracks = await fetchTimedTextTrackList(
    videoId,
    tabInfo.tabId,
    preferredLanguage
  );
  if (!Array.isArray(tracks) || tracks.length === 0) {
    addDiagStep("TIMEDTEXT_LIST", "error", {
      error: "no_caption_tracks",
    });
    throw new Error("no_caption_tracks");
  }
  addDiagStep("TIMEDTEXT_LIST", "ok", {
    tracks: tracks.length,
  });

  for (const track of tracks) {
    const baseUrl = String(track?.baseUrl || "").trim();
    if (!baseUrl) {
      continue;
    }
    const formatOrder = getCaptionTrackFormatOrder(track);
    addDiagStep("TIMEDTEXT_TRACK", "start", {
      languageCode: track.languageCode,
      auto: track.isAutoGenerated,
      formatOrder: formatOrder.join("->"),
      source: "caption_track_base_url",
    });
    const fetchResult = await fetchCaptionTimelineDetailed(baseUrl, tabInfo.tabId, {
      stage: "TIMEDTEXT_TRACK_FETCH",
      formatOrder,
      htmlEmptyRetry: true,
    });
    const timeline = Array.isArray(fetchResult?.timeline)
      ? fetchResult.timeline
      : [];
    if (timeline.length > 0) {
      addDiagStep("TIMEDTEXT_TRACK", "ok", {
        languageCode: track.languageCode,
        auto: track.isAutoGenerated,
        timelineSize: timeline.length,
      });
      return {
        transcript: timeline.map((entry) => entry.text).join(" ").trim(),
        timeline,
        languageCode: track.languageCode || "unknown",
        languageName: track.name || "",
        isAutoGenerated: Boolean(track.isAutoGenerated),
        title: String(tabInfo.title || "").trim(),
        source: "yt_timedtext",
        engine: "yt_timedtext",
      };
    }
    addDiagStep("TIMEDTEXT_TRACK", "retry", {
      languageCode: track.languageCode,
      auto: track.isAutoGenerated,
      htmlEmptyObserved: Boolean(fetchResult?.htmlEmptyObserved),
      fetchAttempts: Array.isArray(fetchResult?.fetchAttempts)
        ? fetchResult.fetchAttempts.length
        : 0,
    });
  }

  addDiagStep("TIMEDTEXT_LIST", "error", {
    error: "captions_not_found_after_all_tracks",
  });
  throw new Error("captions_not_found");
}

function normalizeLanguageCode(raw) {
  return String(raw || "").trim();
}

function buildVoiceInsightLanguagePriority(captionMeta) {
  const ordered = [];
  const seen = new Set();
  const pushLanguage = (raw) => {
    const code = normalizeLanguageCode(raw);
    if (!code) return;
    const normalizedKey = code.toLowerCase();
    if (seen.has(normalizedKey)) return;
    seen.add(normalizedKey);
    ordered.push(code);
  };

  // Priority 1: align with the player's current selected source track.
  pushLanguage(captionMeta?.track?.languageCode);
  pushLanguage(captionMeta?.activeTrack?.languageCode);

  if (state.locale === "zh") {
    pushLanguage("zh-Hans");
    pushLanguage("zh");
    pushLanguage("en");
  } else {
    pushLanguage("en");
    pushLanguage("zh-Hans");
    pushLanguage("zh");
  }

  const tracks = Array.isArray(captionMeta?.tracks) ? captionMeta.tracks : [];
  tracks.forEach((track) => {
    pushLanguage(track?.languageCode);
  });

  return ordered.slice(0, 8);
}

function getVoiceInsightEngineTimeoutMs(engine) {
  const key = normalizeVoiceInsightEngineName(engine);
  if (key === "youtube-transcript-api") {
    return Number(VOICEINSIGHT_API_ENGINE_TIMEOUT_MS.youtubeTranscriptApi || 7000);
  }
  if (key === "yt-dlp") {
    return Number(VOICEINSIGHT_API_ENGINE_TIMEOUT_MS.ytDlp || 9000);
  }
  return 7000;
}

function getVoiceInsightApiTimeoutMs(mode, requestedEngines = []) {
  const modeKey =
    mode === "manual" ? "manual" : mode === "open" ? "open" : "auto";
  const floorMs = Number(VOICEINSIGHT_API_TIMEOUT_FLOOR_MS[modeKey] || 18_000);
  const engines =
    Array.isArray(requestedEngines) && requestedEngines.length > 0
      ? requestedEngines
      : VOICEINSIGHT_ENGINE_ORDER.slice();
  const engineBudgetMs = engines.reduce(
    (sum, engine) => sum + getVoiceInsightEngineTimeoutMs(engine),
    0
  );
  const overheadMs =
    VOICEINSIGHT_API_TIMEOUT_OVERHEAD_MS +
    Math.max(0, engines.length - 1) * VOICEINSIGHT_API_TIMEOUT_PER_ENGINE_OVERHEAD_MS;
  const estimatedMs = engineBudgetMs + overheadMs;
  const timeoutMs = Math.max(floorMs, estimatedMs);
  return Math.min(VOICEINSIGHT_API_TIMEOUT_CEIL_MS, Math.round(timeoutMs));
}

async function fetchTranscriptFromVoiceInsightApi(tabInfo, options = {}) {
  const videoId = String(tabInfo?.videoId || "").trim();
  if (!videoId) {
    throw new Error("third_party_missing_video_id");
  }

  const preferredLanguageList = buildVoiceInsightLanguagePriority(
    options?.captionMeta
  );
  const preferredLanguages = preferredLanguageList.join(",");
  const apiBase = await resolveApiBase();
  const endpoint = new URL(TRANSCRIPT_FALLBACK_PATH, apiBase);
  const enginePlan = pickVoiceInsightEnginesForRequest();
  const requestedEngines = Array.isArray(enginePlan?.engines) && enginePlan.engines.length > 0
    ? enginePlan.engines
    : VOICEINSIGHT_ENGINE_ORDER.slice();
  endpoint.searchParams.set("videoId", videoId);
  endpoint.searchParams.set("languages", preferredLanguages);
  endpoint.searchParams.set("engines", requestedEngines.join(","));
  endpoint.searchParams.set(
    "engineTimeoutYoutubeMs",
    String(VOICEINSIGHT_API_ENGINE_TIMEOUT_MS.youtubeTranscriptApi)
  );
  endpoint.searchParams.set(
    "engineTimeoutYtDlpMs",
    String(VOICEINSIGHT_API_ENGINE_TIMEOUT_MS.ytDlp)
  );
  const mode =
    options?.mode === "manual"
      ? "manual"
      : options?.mode === "open"
      ? "open"
      : "auto";
  const apiTimeoutMs = getVoiceInsightApiTimeoutMs(mode, requestedEngines);
  const engineBudgetMs = requestedEngines.reduce(
    (sum, engine) => sum + getVoiceInsightEngineTimeoutMs(engine),
    0
  );
  const timeoutOverheadMs =
    VOICEINSIGHT_API_TIMEOUT_OVERHEAD_MS +
    Math.max(0, requestedEngines.length - 1) *
      VOICEINSIGHT_API_TIMEOUT_PER_ENGINE_OVERHEAD_MS;

  addDiagStep("VOICEINSIGHT_API", "start", {
    videoId,
    endpoint: endpoint.toString(),
    engines: requestedEngines,
    cooldownBypassed: Boolean(enginePlan?.cooldownBypassed),
    blockedEngines: Array.isArray(enginePlan?.blocked) ? enginePlan.blocked : [],
    preferredLanguages: preferredLanguageList,
    mode,
    timeoutMs: apiTimeoutMs,
    timeoutEngineBudgetMs: engineBudgetMs,
    timeoutOverheadMs,
    timeoutFloorMs: Number(
      VOICEINSIGHT_API_TIMEOUT_FLOOR_MS[mode === "manual" ? "manual" : mode === "open" ? "open" : "auto"] ||
        18_000
    ),
    engineTimeoutYoutubeMs: VOICEINSIGHT_API_ENGINE_TIMEOUT_MS.youtubeTranscriptApi,
    engineTimeoutYtDlpMs: VOICEINSIGHT_API_ENGINE_TIMEOUT_MS.ytDlp,
    selectedBy: String(options?.captionMeta?.selectedBy || ""),
    activeLanguageCode: String(options?.captionMeta?.activeTrack?.languageCode || ""),
  });

  let response;
  const abortController = new AbortController();
  const timeoutTimer = setTimeout(() => {
    abortController.abort();
  }, apiTimeoutMs);
  try {
    response = await fetch(endpoint.toString(), {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      signal: abortController.signal,
    });
  } catch (error) {
    addDiagStep("VOICEINSIGHT_API", "error", {
      error:
        String(errorToMessage(error)).toLowerCase().includes("abort")
          ? "third_party_timeout"
          : errorToMessage(error),
    });
    if (String(errorToMessage(error)).toLowerCase().includes("abort")) {
      applyVoiceInsightEngineAttemptResults(
        [],
        requestedEngines,
        "bridge_timeout"
      );
      throw new Error("third_party_timeout");
    }
    applyVoiceInsightEngineAttemptResults([], requestedEngines, "third_party_fetch_failed");
    throw new Error("third_party_fetch_failed");
  } finally {
    clearTimeout(timeoutTimer);
  }

  let payloadText = "";
  try {
    payloadText = await response.text();
  } catch {
    payloadText = "";
  }

  let payload = null;
  try {
    payload = payloadText ? JSON.parse(payloadText) : null;
  } catch {
    payload = null;
  }

  let activeResponse = response;
  let activePayload = payload;
  let activeRequestedEngines = requestedEngines.slice();

  if (!activeResponse.ok || activePayload?.ok === false) {
    const initialErrorCode = String(
      activePayload?.error || `http_${activeResponse.status}`
    ).trim();
    const initialAttempts = normalizeVoiceInsightEngineAttempts(
      activePayload?.engineAttempts
    );
    const cookieBridgeDecision = shouldRetryVoiceInsightWithCookieBridge(
      initialErrorCode,
      initialAttempts,
      activeRequestedEngines
    );
    if (cookieBridgeDecision?.allow) {
      addDiagStep("VOICEINSIGHT_COOKIE_BRIDGE", "start", {
        videoId,
        reason: String(cookieBridgeDecision?.reason || "login_required"),
      });
      let cookieBridge = null;
      try {
        cookieBridge = await collectYoutubeCookieHeaderForVoiceInsight();
      } catch (error) {
        addDiagStep("VOICEINSIGHT_COOKIE_BRIDGE", "retry", {
          error: "cookie_bridge_unavailable",
          detail: errorToMessage(error),
        });
        cookieBridge = null;
      }

      const cookieHeader = String(cookieBridge?.header || "");
      if (cookieHeader) {
        addDiagStep("VOICEINSIGHT_COOKIE_BRIDGE", "ok", {
          cookieCount: Number(cookieBridge?.count || 0),
          cookieBytes: Number(cookieBridge?.bytes || 0),
        });
        const retryEngines = ["yt-dlp"];
        const retryEndpoint = new URL(TRANSCRIPT_FALLBACK_PATH, apiBase);
        retryEndpoint.searchParams.set("videoId", videoId);
        retryEndpoint.searchParams.set("languages", preferredLanguages);
        retryEndpoint.searchParams.set("engines", retryEngines.join(","));
        retryEndpoint.searchParams.set(
          "engineTimeoutYoutubeMs",
          String(VOICEINSIGHT_API_ENGINE_TIMEOUT_MS.youtubeTranscriptApi)
        );
        retryEndpoint.searchParams.set(
          "engineTimeoutYtDlpMs",
          String(VOICEINSIGHT_API_ENGINE_TIMEOUT_MS.ytDlp)
        );
        const retryTimeoutMs = getVoiceInsightApiTimeoutMs(mode, retryEngines);
        const retryController = new AbortController();
        const retryTimeoutTimer = setTimeout(() => {
          retryController.abort();
        }, retryTimeoutMs);
        try {
          const retryResponse = await fetch(retryEndpoint.toString(), {
            method: "GET",
            credentials: "omit",
            cache: "no-store",
            signal: retryController.signal,
            headers: {
              "x-vi-youtube-cookie": cookieHeader,
              "x-vi-cookie-source": "extension_cookie_api",
            },
          });
          let retryPayloadText = "";
          try {
            retryPayloadText = await retryResponse.text();
          } catch {
            retryPayloadText = "";
          }
          let retryPayload = null;
          try {
            retryPayload = retryPayloadText ? JSON.parse(retryPayloadText) : null;
          } catch {
            retryPayload = null;
          }
          activeResponse = retryResponse;
          activePayload = retryPayload;
          activeRequestedEngines = retryEngines;
          if (!retryResponse.ok || retryPayload?.ok === false) {
            const retryErrorCode = String(
              retryPayload?.error || `http_${retryResponse.status}`
            ).trim();
            addDiagStep("VOICEINSIGHT_COOKIE_BRIDGE", "error", {
              status: retryResponse.status,
              error: retryErrorCode || "cookie_bridge_failed",
              engineAttempts: normalizeVoiceInsightEngineAttempts(
                retryPayload?.engineAttempts
              ),
            });
          }
        } catch (error) {
          addDiagStep("VOICEINSIGHT_COOKIE_BRIDGE", "error", {
            error:
              String(errorToMessage(error)).toLowerCase().includes("abort")
                ? "third_party_timeout"
                : "cookie_bridge_failed",
          });
        } finally {
          clearTimeout(retryTimeoutTimer);
        }
      } else {
        addDiagStep("VOICEINSIGHT_COOKIE_BRIDGE", "retry", {
          error: "cookie_bridge_no_cookies",
        });
      }
    }
  }

  if (!activeResponse.ok || activePayload?.ok === false) {
    const errorCode = String(
      activePayload?.error || `http_${activeResponse.status}`
    ).trim();
    const attempts = normalizeVoiceInsightEngineAttempts(activePayload?.engineAttempts);
    applyVoiceInsightEngineAttemptResults(attempts, activeRequestedEngines, errorCode);
    addDiagStep("VOICEINSIGHT_API", "error", {
      status: activeResponse.status,
      error: errorCode || "third_party_failed",
      engineAttempts: attempts,
    });
    throw new Error(`third_party_${errorCode || "failed"}`);
  }

  const timeline = normalizeTranscriptEntries(
    Array.isArray(activePayload?.timeline) ? activePayload.timeline : [],
    String(activePayload?.transcript || "")
  );
  if (!timeline.length) {
    const attempts = normalizeVoiceInsightEngineAttempts(activePayload?.engineAttempts);
    applyVoiceInsightEngineAttemptResults(
      attempts,
      activeRequestedEngines,
      "captions_not_found"
    );
    addDiagStep("VOICEINSIGHT_API", "error", {
      status: activeResponse.status,
      error: "third_party_captions_not_found",
      engineAttempts: attempts,
    });
    throw new Error("third_party_captions_not_found");
  }

  const successAttemptsRaw = Array.isArray(activePayload?.engineAttempts)
    ? activePayload.engineAttempts
    : [
        {
          engine: normalizeVoiceInsightEngineName(activePayload?.engine || activePayload?.source || "") || activeRequestedEngines[0] || "",
          ok: true,
          code: "ok",
          status: activeResponse.status,
          elapsedMs: null,
        },
      ];
  const successAttempts = applyVoiceInsightEngineAttemptResults(
    successAttemptsRaw,
    activeRequestedEngines,
    ""
  );

  addDiagStep("VOICEINSIGHT_API", "ok", {
    status: activeResponse.status,
    lines: timeline.length,
    languageCode: String(activePayload?.languageCode || "unknown"),
    source: String(activePayload?.source || ""),
    engine: String(activePayload?.engine || ""),
    engineAttempts: successAttempts,
  });

  return {
    transcript:
      String(activePayload?.transcript || "").trim() ||
      timeline.map((entry) => entry.text).join(" ").trim(),
    timeline,
    languageCode: String(activePayload?.languageCode || "unknown"),
    languageName: String(activePayload?.languageName || ""),
    isAutoGenerated: Boolean(activePayload?.isAutoGenerated),
    title: String(activePayload?.title || tabInfo?.title || "").trim(),
    source: String(activePayload?.source || ""),
    engine: String(activePayload?.engine || ""),
    engineAttempts: successAttempts,
  };
}

function normalizeTimedtextTrackList(captionData, preferredLanguage) {
  const orderedTracks = orderCaptionTracksForExtraction(captionData, preferredLanguage);
  const normalized = [];
  const seen = new Set();
  orderedTracks.forEach((track) => {
    const baseUrl = String(track?.baseUrl || "").trim();
    if (!baseUrl) return;
    const normalizedTrack = {
      baseUrl,
      languageCode: String(track?.languageCode || "").trim(),
      name: String(track?.name || "").trim(),
      isAutoGenerated: Boolean(track?.isAutoGenerated),
      vssId: String(track?.vssId || "").trim(),
    };
    const key = getCaptionTrackIdentity(normalizedTrack);
    if (!key || seen.has(key)) return;
    seen.add(key);
    normalized.push(normalizedTrack);
  });
  return normalized;
}

function orderTimedtextTracksByPreference(tracks, preferredLanguage) {
  const normalized = [];
  const seen = new Set();
  tracks.forEach((track) => {
    const baseUrl = String(track?.baseUrl || "").trim();
    if (!baseUrl) return;
    const item = {
      baseUrl,
      languageCode: String(track?.languageCode || "").trim(),
      name: String(track?.name || "").trim(),
      isAutoGenerated: Boolean(track?.isAutoGenerated),
      vssId: String(track?.vssId || "").trim(),
    };
    const key = getCaptionTrackIdentity(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    normalized.push(item);
  });

  const preferred = String(preferredLanguage || "").trim().toLowerCase();
  const preferredMatches = preferred
    ? normalized.filter((item) =>
        String(item.languageCode || "").toLowerCase().startsWith(preferred)
      )
    : [];
  const manualPreferred = preferredMatches.filter((item) => !item.isAutoGenerated);
  const autoPreferred = preferredMatches.filter((item) => item.isAutoGenerated);

  const manualOthers = normalized.filter(
    (item) =>
      !item.isAutoGenerated &&
      !manualPreferred.some((pick) => isSameCaptionTrack(pick, item))
  );
  const autoOthers = normalized.filter(
    (item) =>
      item.isAutoGenerated &&
      !autoPreferred.some((pick) => isSameCaptionTrack(pick, item))
  );

  return [...manualPreferred, ...autoPreferred, ...manualOthers, ...autoOthers];
}

function fetchTimedTextTracksFromAndroidPlayer(tabId, videoId, preferredLanguage) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        world: "MAIN",
        args: [videoId, preferredLanguage],
        func: async (expectedVideoId, preferredLang) => {
          const sanitizeLanguage = (value) => {
            const raw = String(value || "").trim().toLowerCase();
            if (!raw) return "en";
            if (raw.startsWith("zh")) return "zh-CN";
            if (raw.startsWith("en")) return "en";
            return raw;
          };
          const formatTrackName = (track) => {
            if (track?.name?.simpleText) return track.name.simpleText;
            if (Array.isArray(track?.name?.runs)) {
              return track.name.runs.map((run) => run?.text || "").join("");
            }
            return String(track?.languageCode || "");
          };
          const normalizeTrackId = (track) =>
            String(track?.vssId || track?.vss_id || "").trim();
          const toTrack = (track) => ({
            baseUrl: String(track?.baseUrl || "").trim(),
            languageCode: String(track?.languageCode || "").trim(),
            name: String(formatTrackName(track) || "").trim(),
            isAutoGenerated: String(track?.kind || "").toLowerCase() === "asr",
            vssId: normalizeTrackId(track),
          });

          try {
            const ytcfg = window.ytcfg;
            const apiKey = String(
              ytcfg?.get?.("INNERTUBE_API_KEY") ||
                ytcfg?.data_?.INNERTUBE_API_KEY ||
                ""
            ).trim();
            if (!apiKey) {
              return { ok: false, error: "timedtext_android_api_key_missing" };
            }
            const visitorData = String(
              ytcfg?.get?.("VISITOR_DATA") || ytcfg?.data_?.VISITOR_DATA || ""
            ).trim();
            const stsRaw = Number(
              ytcfg?.get?.("STS") || ytcfg?.data_?.STS || 0
            );
            const signatureTimestamp =
              Number.isFinite(stsRaw) && stsRaw > 0 ? Math.floor(stsRaw) : 20544;
            const language = sanitizeLanguage(preferredLang);
            const clientVersion = "20.10.38";
            const headers = {
              "content-type": "application/json",
              "x-youtube-client-name": "3",
              "x-youtube-client-version": clientVersion,
            };
            if (visitorData) {
              headers["x-goog-visitor-id"] = visitorData;
            }
            const payload = {
              context: {
                client: {
                  clientName: "ANDROID",
                  clientVersion,
                  userAgent:
                    "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip",
                  osName: "Android",
                  osVersion: "11",
                  hl: language,
                  gl: "US",
                  timeZone: "UTC",
                  utcOffsetMinutes: 0,
                },
                user: { lockedSafetyMode: false },
                request: { useSsl: true },
              },
              videoId: String(expectedVideoId || "").trim(),
              playbackContext: {
                contentPlaybackContext: {
                  html5Preference: "HTML5_PREF_WANTS",
                  signatureTimestamp,
                },
              },
              contentCheckOk: true,
              racyCheckOk: true,
            };

            const endpoint = `https://www.youtube.com/youtubei/v1/player?prettyPrint=false&key=${encodeURIComponent(
              apiKey
            )}`;
            const response = await fetch(endpoint, {
              method: "POST",
              headers,
              credentials: "include",
              body: JSON.stringify(payload),
            });
            const raw = await response.text();
            if (!response.ok) {
              return {
                ok: false,
                error: `timedtext_android_player_http_${response.status}`,
                status: Number(response.status) || 0,
                payloadLength: raw.length,
              };
            }
            let data = null;
            try {
              data = JSON.parse(raw);
            } catch {
              return {
                ok: false,
                error: "timedtext_android_player_json_invalid",
                status: Number(response.status) || 0,
              };
            }
            const actualVideoId = String(data?.videoDetails?.videoId || "").trim();
            if (expectedVideoId && actualVideoId && actualVideoId !== expectedVideoId) {
              return {
                ok: false,
                error: "timedtext_android_player_mismatch",
                expectedVideoId,
                actualVideoId,
              };
            }
            const rawTracks =
              data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
            const tracks = Array.isArray(rawTracks)
              ? rawTracks.map(toTrack).filter((item) => item.baseUrl)
              : [];
            return {
              ok: true,
              tracks,
              status: Number(response.status) || 0,
              actualVideoId,
              visitorDataPresent: Boolean(visitorData),
              signatureTimestamp,
            };
          } catch (error) {
            return {
              ok: false,
              error: `timedtext_android_player_exception_${String(
                error?.message || error || "unknown"
              )}`,
            };
          }
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "execute_script_failed"));
          return;
        }
        const result = results?.[0]?.result;
        if (!result || typeof result !== "object") {
          reject(new Error("timedtext_android_player_empty_result"));
          return;
        }
        if (!result.ok) {
          resolve({
            ok: false,
            error: String(result.error || "timedtext_android_player_failed"),
            status: Number(result.status || 0),
            tracks: [],
            actualVideoId: String(result.actualVideoId || ""),
            signatureTimestamp: Number(result.signatureTimestamp || 0),
            visitorDataPresent: Boolean(result.visitorDataPresent),
          });
          return;
        }
        resolve({
          ok: true,
          status: Number(result.status || 0),
          tracks: Array.isArray(result.tracks) ? result.tracks : [],
          actualVideoId: String(result.actualVideoId || ""),
          signatureTimestamp: Number(result.signatureTimestamp || 0),
          visitorDataPresent: Boolean(result.visitorDataPresent),
        });
      }
    );
  });
}

async function fetchTimedTextTrackList(videoId, tabId, preferredLanguage) {
  const language = String(preferredLanguage || "").trim() || "en";
  try {
    const androidResult = await fetchTimedTextTracksFromAndroidPlayer(
      tabId,
      videoId,
      language
    );
    const androidTracks = orderTimedtextTracksByPreference(
      Array.isArray(androidResult?.tracks) ? androidResult.tracks : [],
      language
    );
    addDiagStep(
      "TIMEDTEXT_LIST_FETCH_ANDROID",
      androidTracks.length > 0 ? "ok" : "retry",
      {
        status: Number(androidResult?.status || 0),
        tracks: androidTracks.length,
        actualVideoId: String(androidResult?.actualVideoId || ""),
        visitorDataPresent: Boolean(androidResult?.visitorDataPresent),
        signatureTimestamp: Number(androidResult?.signatureTimestamp || 0),
        error: String(androidResult?.error || ""),
      }
    );
    if (androidTracks.length > 0) {
      return androidTracks;
    }
  } catch (error) {
    addDiagStep("TIMEDTEXT_LIST_FETCH_ANDROID", "error", {
      error: errorToMessage(error),
    });
  }

  try {
    const captionData = await requestCaptionsWithRetry(tabId, language, videoId, {
      stage: "TIMEDTEXT_LIST_FETCH_META",
      maxAttempts: 4,
    });
    const tracks = normalizeTimedtextTrackList(captionData, language);
    addDiagStep("TIMEDTEXT_LIST_FETCH", tracks.length > 0 ? "ok" : "retry", {
      source: "player_caption_tracks",
      tracks: tracks.length,
      selectedBy: String(captionData?.selectedBy || ""),
      selectedLanguageCode: String(captionData?.track?.languageCode || ""),
      activeLanguageCode: String(captionData?.activeTrack?.languageCode || ""),
      reportedTrackCount: Number(captionData?.trackCount || 0),
    });
    return tracks;
  } catch (error) {
    addDiagStep("TIMEDTEXT_LIST_FETCH", "error", {
      source: "player_caption_tracks",
      error: errorToMessage(error),
    });
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function requestCaptionsWithRetry(
  tabId,
  preferredLanguage,
  expectedVideoId,
  options = {}
) {
  const stage = String(options?.stage || "GET_CAPTIONS").trim() || "GET_CAPTIONS";
  const maxAttempts = Number.isInteger(options?.maxAttempts)
    ? Math.max(1, Math.min(6, Number(options.maxAttempts)))
    : 4;
  let lastError = new Error("captions_not_found");

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      addDiagStep(stage, "start", {
        attempt: attempt + 1,
        expectedVideoId,
        preferredLanguage,
      });
      const result = await readCaptionsFromMainWorld(
        tabId,
        preferredLanguage,
        expectedVideoId,
        { stage }
      );
      if (result?.ok && result?.data?.track?.baseUrl) {
        addDiagStep(stage, "ok", {
          actualVideoId: String(result?.data?.video?.videoId || ""),
          trackCount: Number(result?.data?.trackCount || 0),
          languageCode: result?.data?.track?.languageCode || "",
          selectedBy: String(result?.data?.selectedBy || ""),
          activeLanguageCode: String(result?.data?.activeTrack?.languageCode || ""),
        });
        return result.data;
      }
      const errorCode = String(result?.error || "captions_not_found");
      addDiagStep(stage, "retry", {
        attempt: attempt + 1,
        error: errorCode,
      });
      lastError = new Error(errorCode);
      if (
        attempt < maxAttempts - 1 &&
        (errorCode === "player_response_mismatch" ||
          errorCode === "player_response_not_found")
      ) {
        await sleep(320 + attempt * 180);
        continue;
      }
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      addDiagStep(stage, "retry", {
        attempt: attempt + 1,
        error: errorToMessage(lastError),
      });
      if (
        attempt < maxAttempts - 1 &&
        String(lastError.message || "")
          .toLowerCase()
          .includes("player_response")
      ) {
        await sleep(320 + attempt * 180);
        continue;
      }
      break;
    }
  }

  addDiagStep(stage, "error", {
    error: errorToMessage(lastError),
  });
  throw lastError;
}

function readCaptionsFromMainWorld(
  tabId,
  preferredLanguage,
  expectedVideoId,
  options = {}
) {
  const stage = String(options?.stage || "GET_CAPTIONS").trim() || "GET_CAPTIONS";
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        world: "MAIN",
        args: [preferredLanguage, expectedVideoId],
        func: (preferredLang, expectedId) => {
          const readPlayerResponseFromPlayer = () => {
            try {
              const player = document.getElementById("movie_player");
              if (player && typeof player.getPlayerResponse === "function") {
                const response = player.getPlayerResponse();
                if (response && typeof response === "object") return response;
              }
            } catch {
              return null;
            }
            return null;
          };

          const readPlayerResponseFromWindow = () => {
            if (window.ytInitialPlayerResponse) {
              return window.ytInitialPlayerResponse;
            }
            const rawResponse = window.ytplayer?.config?.args?.player_response;
            if (rawResponse) {
              if (typeof rawResponse === "string") {
                try {
                  return JSON.parse(rawResponse);
                } catch {
                  return null;
                }
              }
              return rawResponse;
            }
            return null;
          };

          const extractJsonAfterMarker = (text, marker) => {
            const markerIndex = text.indexOf(marker);
            if (markerIndex === -1) return null;
            const start = text.indexOf("{", markerIndex);
            if (start === -1) return null;
            let depth = 0;
            for (let i = start; i < text.length; i += 1) {
              const char = text[i];
              if (char === "{") depth += 1;
              if (char === "}") depth -= 1;
              if (depth === 0) {
                return text.slice(start, i + 1);
              }
            }
            return null;
          };

          const readPlayerResponseFromDom = () => {
            const scripts = Array.from(document.scripts || []);
            const candidates = scripts
              .map((script) => script.textContent || "")
              .filter(Boolean);
            const preferred = candidates.find(
              (text) =>
                text.includes("ytInitialPlayerResponse") &&
                text.includes("captionTracks")
            );
            const fallback = candidates.find((text) =>
              text.includes("ytInitialPlayerResponse")
            );
            const scriptText = preferred || fallback;
            if (!scriptText) return null;
            const jsonText = extractJsonAfterMarker(
              scriptText,
              "ytInitialPlayerResponse"
            );
            if (!jsonText) return null;
            try {
              return JSON.parse(jsonText);
            } catch {
              return null;
            }
          };

          const readPlayerResponse = () =>
            readPlayerResponseFromPlayer() ||
            readPlayerResponseFromWindow() ||
            readPlayerResponseFromDom();

          const readActiveTrackOption = () => {
            try {
              const player = document.getElementById("movie_player");
              if (!player || typeof player.getOption !== "function") {
                return null;
              }
              const option = player.getOption("captions", "track");
              return option && typeof option === "object" ? option : null;
            } catch {
              return null;
            }
          };

          const formatTrackName = (track) => {
            if (track?.name?.simpleText) return track.name.simpleText;
            if (Array.isArray(track?.name?.runs)) {
              return track.name.runs.map((run) => run.text).join("");
            }
            return track?.languageCode || "unknown";
          };

          const normalizeTrackId = (track) =>
            String(track?.vssId || track?.vss_id || "").trim();

          const findTrackByOption = (tracks, option) => {
            if (!Array.isArray(tracks) || tracks.length === 0 || !option) {
              return null;
            }
            const optionId = normalizeTrackId(option);
            if (optionId) {
              const matchedById = tracks.find(
                (track) => normalizeTrackId(track) === optionId
              );
              if (matchedById) return matchedById;
            }

            const optionLanguage = String(
              option?.languageCode ||
                option?.language_code ||
                option?.lang ||
                ""
            )
              .trim()
              .toLowerCase();
            const optionKind = String(option?.kind || "")
              .trim()
              .toLowerCase();
            if (optionLanguage && optionKind) {
              const matchedByLangAndKind = tracks.find(
                (track) =>
                  String(track?.languageCode || "").toLowerCase() === optionLanguage &&
                  String(track?.kind || "").toLowerCase() === optionKind
              );
              if (matchedByLangAndKind) return matchedByLangAndKind;
            }
            if (optionLanguage) {
              const matchedByLang = tracks.find(
                (track) =>
                  String(track?.languageCode || "").toLowerCase() === optionLanguage
              );
              if (matchedByLang) return matchedByLang;
              const matchedByPrefix = tracks.find((track) =>
                String(track?.languageCode || "")
                  .toLowerCase()
                  .startsWith(optionLanguage)
              );
              if (matchedByPrefix) return matchedByPrefix;
            }
            return null;
          };

          const pickTrackByRendererIndex = (renderer, tracks) => {
            if (!renderer || !Array.isArray(tracks) || tracks.length === 0) {
              return null;
            }
            const candidates = [
              renderer.selectedCaptionTrackIndex,
              renderer.defaultCaptionTrackIndex,
            ];
            for (const rawIndex of candidates) {
              const index = Number(rawIndex);
              if (!Number.isInteger(index)) continue;
              if (index < 0 || index >= tracks.length) continue;
              const picked = tracks[index];
              if (picked) return picked;
            }
            return null;
          };

          const pickTrackByAudioTracks = (renderer, tracks) => {
            if (!renderer || !Array.isArray(tracks) || tracks.length === 0) {
              return null;
            }
            const audioTracks = Array.isArray(renderer?.audioTracks)
              ? renderer.audioTracks
              : [];
            if (audioTracks.length === 0) return null;

            const orderedAudioTracks = [];
            const defaultAudioIndex = Number(renderer.defaultAudioTrackIndex);
            if (
              Number.isInteger(defaultAudioIndex) &&
              defaultAudioIndex >= 0 &&
              defaultAudioIndex < audioTracks.length
            ) {
              orderedAudioTracks.push(audioTracks[defaultAudioIndex]);
            }
            audioTracks.forEach((item) => {
              if (!item) return;
              if (orderedAudioTracks.includes(item)) return;
              orderedAudioTracks.push(item);
            });

            for (const audioTrack of orderedAudioTracks) {
              const captionTrackIndices = Array.isArray(audioTrack?.captionTrackIndices)
                ? audioTrack.captionTrackIndices
                : [];
              for (const rawIndex of captionTrackIndices) {
                const index = Number(rawIndex);
                if (!Number.isInteger(index)) continue;
                if (index < 0 || index >= tracks.length) continue;
                const picked = tracks[index];
                if (picked) return picked;
              }
              const defaultCaptionIndex = Number(audioTrack?.defaultCaptionTrackIndex);
              if (
                Number.isInteger(defaultCaptionIndex) &&
                defaultCaptionIndex >= 0 &&
                defaultCaptionIndex < tracks.length
              ) {
                const picked = tracks[defaultCaptionIndex];
                if (picked) return picked;
              }
            }

            return null;
          };

          const pickBestTrack = (tracks) => {
            if (!tracks || tracks.length === 0) return null;
            const preferred = (preferredLang ?? "").toLowerCase();
            const matches = preferred
              ? tracks.filter((track) =>
                  (track.languageCode ?? "")
                    .toLowerCase()
                    .startsWith(preferred)
                )
              : [];
            const pickManual = (list) =>
              list.find((track) => track.kind !== "asr") ?? list[0];
            if (matches.length > 0) return pickManual(matches);
            const manual = tracks.find((track) => track.kind !== "asr");
            return manual ?? tracks[0];
          };

          const buildTrackInfo = (track) => ({
            baseUrl: track.baseUrl,
            languageCode: track.languageCode,
            name: formatTrackName(track),
            vssId: normalizeTrackId(track),
            kind: track.kind ?? "",
            isAutoGenerated: track.kind === "asr",
          });

          const response = readPlayerResponse();
          if (!response) {
            return { ok: false, error: "player_response_not_found" };
          }
          const actualId = response?.videoDetails?.videoId || "";
          if (expectedId && actualId && actualId !== expectedId) {
            return {
              ok: false,
              error: "player_response_mismatch",
              expectedVideoId: expectedId,
              actualVideoId: actualId,
            };
          }
          const renderer =
            response?.captions?.playerCaptionsTracklistRenderer ?? null;
          const tracks = renderer?.captionTracks ?? [];
          if (!tracks || tracks.length === 0) {
            return { ok: false, error: "no_caption_tracks" };
          }

          const activeTrackOption = readActiveTrackOption();
          const activeTrack =
            findTrackByOption(tracks, activeTrackOption) ||
            pickTrackByRendererIndex(renderer, tracks) ||
            pickTrackByAudioTracks(renderer, tracks) ||
            null;
          const preferredTrack = pickBestTrack(tracks);
          const selected = activeTrack || preferredTrack;
          if (!selected?.baseUrl) {
            return { ok: false, error: "caption_track_missing_url" };
          }

          const selectedBy = activeTrack
            ? "player_active_track"
            : "preferred_language_fallback";
          return {
            ok: true,
            data: {
              video: {
                videoId: actualId || expectedId || "",
                title: response?.videoDetails?.title ?? document.title ?? "",
                url: window.location.href,
              },
              track: buildTrackInfo(selected),
              activeTrack: activeTrack ? buildTrackInfo(activeTrack) : null,
              preferredTrack: preferredTrack ? buildTrackInfo(preferredTrack) : null,
              tracks: tracks.map(buildTrackInfo),
              trackCount: tracks.length,
              selectedBy,
            },
          };
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          addDiagStep(stage, "error", {
            executeScriptError: chrome.runtime.lastError.message,
          });
          reject(new Error(chrome.runtime.lastError.message || "execute_script_failed"));
          return;
        }
        const result = results?.[0]?.result;
        if (!result) {
          addDiagStep(stage, "error", {
            responseError: "empty_execute_result",
          });
          resolve({ ok: false, error: "player_response_not_found" });
          return;
        }
        if (!result.ok) {
          addDiagStep(stage, "error", {
            responseError: result.error || "captions_not_found",
            expectedVideoId: result.expectedVideoId || "",
            actualVideoId: result.actualVideoId || "",
          });
        }
        resolve(result);
      }
    );
  });
}

function normalizeCaptionLanguageCode(raw) {
  return String(raw || "").trim().toLowerCase();
}

function isManualCaptionTrack(track) {
  return !Boolean(track?.isAutoGenerated);
}

function getCaptionTrackIdentity(track) {
  return String(track?.vssId || "").trim() || String(track?.baseUrl || "").trim();
}

function matchesCaptionLanguageExact(track, languageCode) {
  const target = normalizeCaptionLanguageCode(languageCode);
  if (!target) return false;
  return normalizeCaptionLanguageCode(track?.languageCode) === target;
}

function matchesCaptionLanguageVariant(track, languageCode) {
  const target = normalizeCaptionLanguageCode(languageCode);
  const actual = normalizeCaptionLanguageCode(track?.languageCode);
  if (!target || !actual) return false;
  if (actual === target) return false;
  return actual.startsWith(`${target}-`) || target.startsWith(`${actual}-`);
}

function buildCaptionTrackLanguagePriority(captionData, preferredLanguage) {
  const out = [];
  const seen = new Set();
  const push = (value) => {
    const normalized = normalizeCaptionLanguageCode(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  // User-targeted language first.
  push(preferredLanguage);
  // Then follow current player-active/selected language.
  push(captionData?.activeTrack?.languageCode);
  push(captionData?.track?.languageCode);

  if (state.locale === "zh") {
    push("zh-Hans");
    push("zh");
    push("en");
  } else {
    push("en");
    push("zh-Hans");
    push("zh");
  }
  return out;
}

function getCaptionTrackFormatOrder(track) {
  if (track?.isAutoGenerated) {
    return ["srv3", "json3", "default", "ttml", "vtt"];
  }
  return ["default", "json3", "vtt", "ttml", "srv3"];
}

function orderCaptionTracksForExtraction(captionData, preferredLanguage) {
  const tracks = Array.isArray(captionData?.tracks) ? captionData.tracks : [];
  const seeds = [
    captionData?.track,
    captionData?.activeTrack,
    captionData?.preferredTrack,
    ...tracks,
  ];

  const normalizedTracks = [];
  const normalizedSeen = new Set();
  seeds.forEach((item) => {
    const baseUrl = String(item?.baseUrl || "").trim();
    if (!baseUrl) return;
    const normalized = {
      baseUrl,
      languageCode: String(item?.languageCode || "").trim(),
      name: String(item?.name || "").trim(),
      isAutoGenerated: Boolean(item?.isAutoGenerated),
      vssId: String(item?.vssId || "").trim(),
    };
    const key = getCaptionTrackIdentity(normalized);
    if (!key || normalizedSeen.has(key)) return;
    normalizedSeen.add(key);
    normalizedTracks.push(normalized);
  });

  const manualTracks = normalizedTracks.filter((track) => isManualCaptionTrack(track));
  const autoTracks = normalizedTracks.filter((track) => !isManualCaptionTrack(track));
  const languagePriority = buildCaptionTrackLanguagePriority(captionData, preferredLanguage);

  const ordered = [];
  const orderedSeen = new Set();
  const pushTrack = (track) => {
    const key = getCaptionTrackIdentity(track);
    if (!key || orderedSeen.has(key)) return;
    orderedSeen.add(key);
    ordered.push(track);
  };

  languagePriority.forEach((code) => {
    manualTracks
      .filter((track) => matchesCaptionLanguageExact(track, code))
      .forEach(pushTrack);
    autoTracks
      .filter((track) => matchesCaptionLanguageExact(track, code))
      .forEach(pushTrack);
  });

  languagePriority.forEach((code) => {
    manualTracks
      .filter((track) => matchesCaptionLanguageVariant(track, code))
      .forEach(pushTrack);
    autoTracks
      .filter((track) => matchesCaptionLanguageVariant(track, code))
      .forEach(pushTrack);
  });

  manualTracks.forEach(pushTrack);
  autoTracks.forEach(pushTrack);

  return ordered;
}

function isSameCaptionTrack(a, b) {
  return (
    String(a?.vssId || "").trim() &&
    String(a?.vssId || "").trim() === String(b?.vssId || "").trim()
  ) || String(a?.baseUrl || "").trim() === String(b?.baseUrl || "").trim();
}

async function fetchCaptionTimelineDetailed(baseUrl, tabId, options = {}) {
  const stage = String(options?.stage || "TIMEDTEXT_FETCH").trim() || "TIMEDTEXT_FETCH";
  const requestedFormatOrder = Array.isArray(options?.formatOrder)
    ? options.formatOrder
    : [];
  const htmlEmptyRetryEnabled = options?.htmlEmptyRetry !== false;
  const formatOrder = requestedFormatOrder
    .map((item) => String(item || "").trim().toLowerCase())
    .filter((item) => ["default", "json3", "srv3", "vtt", "ttml"].includes(item));

  const tryUrls = [];
  const seen = new Set();
  const pushTryUrl = (rawUrl) => {
    const url = String(rawUrl || "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    tryUrls.push(url);
  };
  const effectiveFormatOrder = formatOrder.length
    ? formatOrder
    : ["default", "json3", "srv3", "vtt", "ttml"];
  effectiveFormatOrder.forEach((fmt) => {
    if (fmt === "default") {
      pushTryUrl(baseUrl);
      return;
    }
    pushTryUrl(ensureCaptionUrl(baseUrl, fmt));
  });

  let htmlEmptyObserved = false;
  const htmlEmptyRetriedUrls = new Set();
  const fetchAttempts = [];
  for (const url of tryUrls) {
    const payloadResult = await fetchCaptionPayloadDetailed(url, tabId);
    const payload = String(payloadResult?.payload || "");
    const parsed = parseTimelinePayload(payload);
    const attempt = {
      url,
      responseUrl: String(payloadResult?.responseUrl || url),
      fmt: readTimedtextFormat(url) || "default",
      status: Number(payloadResult?.status || 0),
      ok: Boolean(payloadResult?.ok),
      contentType: String(payloadResult?.contentType || ""),
      via: String(payloadResult?.via || ""),
      payloadLength: String(payload || "").length,
      payloadKind: detectTimedtextPayloadKind(payload),
      bodyPrefix: getTimedtextBodyPreview(payload),
      parsed: parsed.length,
      requestError: String(payloadResult?.requestError || ""),
    };
    fetchAttempts.push(attempt);
    addDiagStep(stage, parsed.length > 0 ? "ok" : "retry", attempt);

    if (parsed.length > 0) {
      return {
        timeline: parsed,
        htmlEmptyObserved: false,
        fetchAttempts,
      };
    }

    const isHtmlEmpty =
      attempt.status === 200 &&
      attempt.contentType.toLowerCase().includes("text/html") &&
      Number(attempt.payloadLength) === 0;
    if (isHtmlEmpty) {
      htmlEmptyObserved = true;
      if (htmlEmptyRetryEnabled && !htmlEmptyRetriedUrls.has(url)) {
        htmlEmptyRetriedUrls.add(url);
        await sleep(160);
        const retryPayloadResult = await fetchCaptionPayloadDetailed(url, tabId);
        const retryPayload = String(retryPayloadResult?.payload || "");
        const retryParsed = parseTimelinePayload(retryPayload);
        const retryAttempt = {
          url,
          responseUrl: String(retryPayloadResult?.responseUrl || url),
          fmt: readTimedtextFormat(url) || "default",
          status: Number(retryPayloadResult?.status || 0),
          ok: Boolean(retryPayloadResult?.ok),
          contentType: String(retryPayloadResult?.contentType || ""),
          via: String(retryPayloadResult?.via || ""),
          payloadLength: String(retryPayload || "").length,
          payloadKind: detectTimedtextPayloadKind(retryPayload),
          bodyPrefix: getTimedtextBodyPreview(retryPayload),
          parsed: retryParsed.length,
          requestError: String(retryPayloadResult?.requestError || ""),
          htmlEmptyRetry: true,
        };
        fetchAttempts.push(retryAttempt);
        addDiagStep(stage, retryParsed.length > 0 ? "ok" : "retry", retryAttempt);
        if (retryParsed.length > 0) {
          return {
            timeline: retryParsed,
            htmlEmptyObserved: false,
            fetchAttempts,
          };
        }

        const retryIsHtmlEmpty =
          retryAttempt.status === 200 &&
          retryAttempt.contentType.toLowerCase().includes("text/html") &&
          Number(retryAttempt.payloadLength) === 0;
        if (retryIsHtmlEmpty) {
          htmlEmptyObserved = true;
        }
      }
      continue;
    }
  }

  return {
    timeline: [],
    htmlEmptyObserved,
    fetchAttempts,
  };
}

async function fetchCaptionPayloadDetailed(url, tabId) {
  try {
    const pageResult = await fetchTextViaPageDetailed(tabId, url);
    addDiagStep("FETCH_PAGE", pageResult.ok ? "ok" : "retry", {
      url,
      status: Number(pageResult?.status || 0),
      contentType: String(pageResult?.contentType || ""),
      payloadLength: String(pageResult?.text || "").length,
      requestError: String(pageResult?.error || ""),
    });
    if (pageResult.ok || Number(pageResult?.status || 0) > 0) {
      return {
        ok: Boolean(pageResult?.ok),
        status: Number(pageResult?.status || 0),
        contentType: String(pageResult?.contentType || ""),
        payload: String(pageResult?.text || ""),
        responseUrl: String(pageResult?.url || url),
        requestError: String(pageResult?.error || ""),
        via: "main_world",
      };
    }
  } catch (error) {
    addDiagStep("FETCH_PAGE", "error", {
      url,
      error: errorToMessage(error),
    });
  }

  try {
    const response = await fetch(url, { credentials: "include" });
    const text = await response.text();
    addDiagStep("FETCH_WORKER", response.ok ? "ok" : "retry", {
      url,
      status: response.status,
      contentType: String(response.headers.get("content-type") || ""),
      payloadLength: text.length,
    });
    if (response.ok || response.status > 0) {
      return {
        ok: response.ok,
        status: response.status,
        contentType: String(response.headers.get("content-type") || ""),
        payload: text,
        responseUrl: String(response.url || url),
        requestError: "",
        via: "content_script",
      };
    }
  } catch (error) {
    addDiagStep("FETCH_WORKER", "retry", {
      url,
      error: errorToMessage(error),
    });
    return {
      ok: false,
      status: 0,
      contentType: "",
      payload: "",
      responseUrl: url,
      requestError: errorToMessage(error),
      via: "content_script",
    };
  }

  return {
    ok: false,
    status: 0,
    contentType: "",
    payload: "",
    responseUrl: url,
    requestError: "empty_fetch_result",
    via: "none",
  };
}

function fetchTextViaPageDetailed(tabId, url) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        world: "MAIN",
        args: [url],
        func: async (targetUrl) => {
          try {
            const response = await fetch(targetUrl, { credentials: "include" });
            const text = await response.text();
            return {
              ok: response.ok,
              status: Number(response.status) || 0,
              url: String(response.url || targetUrl),
              contentType: String(response.headers?.get("content-type") || ""),
              text: String(text || ""),
              error: "",
            };
          } catch (error) {
            return {
              ok: false,
              status: 0,
              url: String(targetUrl || ""),
              contentType: "",
              text: "",
              error: String(error?.message || error || "page_fetch_failed"),
            };
          }
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        const result = results?.[0]?.result;
        if (!result || typeof result !== "object") {
          reject(new Error("empty_execute_result"));
          return;
        }
        resolve(result);
      }
    );
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getActiveYoutubeTabInfo() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        addDiagStep("ACTIVE_TAB", "error", {
          error: chrome.runtime.lastError.message,
        });
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const tab = tabs[0];
      if (!tab?.id) {
        addDiagStep("ACTIVE_TAB", "error", {
          error: "no_active_tab",
        });
        reject(new Error("no active tab"));
        return;
      }

      const url = String(tab.url || "");
      if (!isYouTubeUrl(url)) {
        addDiagStep("ACTIVE_TAB", "error", {
          error: "not_youtube_page",
          url,
        });
        reject(new Error("please open a youtube video tab"));
        return;
      }

      resolve({
        tabId: tab.id,
        url,
        title: String(tab.title || ""),
        videoId: extractYouTubeVideoId(url),
      });
    });
  });
}

function isYouTubeUrl(url) {
  return url.includes("youtube.com/") || url.includes("youtu.be/");
}

function extractYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.hostname.includes("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const shortsIndex = parts.indexOf("shorts");
      if (shortsIndex !== -1 && parts[shortsIndex + 1]) {
        return parts[shortsIndex + 1];
      }
      const embedIndex = parts.indexOf("embed");
      if (embedIndex !== -1 && parts[embedIndex + 1]) {
        return parts[embedIndex + 1];
      }
      return "";
    }
  } catch {
    return "";
  }
  return "";
}

async function resolveApiBase() {
  const stored = await getStorage([API_BASE_STORAGE_KEY]);
  const override = String(stored?.[API_BASE_STORAGE_KEY] || "").trim();
  if (!override) return DEFAULT_API_BASE;
  try {
    const parsed = new URL(override);
    return `${parsed.origin}/`;
  } catch {
    return DEFAULT_API_BASE;
  }
}

function isLocalApiBase(apiBase) {
  try {
    const parsed = new URL(String(apiBase || ""));
    const host = String(parsed.hostname || "").trim().toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: null,
      };
    }
    const payload = await response.json().catch(() => null);
    return {
      ok: true,
      status: response.status,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      payload: null,
      error: errorToMessage(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function triggerAgentInstallGuideOnce() {
  const stored = await getStorage([AGENT_INSTALL_GUIDE_TS_STORAGE_KEY]);
  const lastTs = Number(stored?.[AGENT_INSTALL_GUIDE_TS_STORAGE_KEY] || 0);
  const nowTs = Date.now();
  if (
    Number.isFinite(lastTs) &&
    lastTs > 0 &&
    nowTs - lastTs < AGENT_INSTALL_GUIDE_COOLDOWN_MS
  ) {
    return;
  }

  await setStorage({
    [AGENT_INSTALL_GUIDE_TS_STORAGE_KEY]: nowTs,
  });
  try {
    chrome.tabs.create({
      url: `${WEBSITE_HOME_URL}/?from=extension&agent=install&platform=mac`,
      active: true,
    });
  } catch {
    // Ignore guide open failures.
  }
}

function isVoiceInsightAgentHealthyResult(result) {
  const service = String(result?.payload?.service || "");
  return Boolean(result?.ok) && service === "voiceinsight-local-agent";
}

function resolveAgentLauncherBase(apiBase) {
  try {
    const parsed = new URL(String(apiBase || ""));
    const host = String(parsed.hostname || "").trim();
    const protocol = parsed.protocol === "https:" ? "https:" : "http:";
    if (!host) return "";
    return `${protocol}//${host}:${AGENT_LAUNCHER_PORT}/`;
  } catch {
    return "";
  }
}

async function getVoiceInsightAgentLastHealthyTs() {
  const stored = await getStorage([AGENT_LAST_HEALTHY_TS_STORAGE_KEY]);
  const ts = Number(stored?.[AGENT_LAST_HEALTHY_TS_STORAGE_KEY] || 0);
  return Number.isFinite(ts) && ts > 0 ? ts : 0;
}

async function markVoiceInsightAgentHealthyNow() {
  await setStorage({
    [AGENT_LAST_HEALTHY_TS_STORAGE_KEY]: Date.now(),
  });
}

async function waitForVoiceInsightAgentHealthy(healthEndpoint, delaysMs) {
  const waits = Array.isArray(delaysMs) ? delaysMs : [];
  let lastResult = null;
  for (let index = 0; index < waits.length; index += 1) {
    const waitMs = Number(waits[index] || 0);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    const result = await fetchJsonWithTimeout(healthEndpoint, AGENT_HEALTH_TIMEOUT_MS);
    lastResult = result;
    if (isVoiceInsightAgentHealthyResult(result)) {
      return {
        ok: true,
        attempt: index + 1,
        lastResult: result,
      };
    }
  }
  return {
    ok: false,
    attempt: waits.length,
    lastResult,
  };
}

async function tryWakeVoiceInsightAgent(apiBase, healthEndpoint) {
  const launcherBase = resolveAgentLauncherBase(apiBase);
  if (!launcherBase) {
    return {
      attempted: false,
      ready: false,
      reason: "launcher_base_unavailable",
    };
  }

  const launcherHealthEndpoint = new URL(AGENT_LAUNCHER_HEALTH_PATH, launcherBase).toString();
  const launcherWakeEndpoint = new URL(AGENT_LAUNCHER_WAKE_PATH, launcherBase).toString();
  addDiagStep("VOICEINSIGHT_AGENT_WAKE", "start", {
    launcherHealthEndpoint,
    launcherWakeEndpoint,
  });

  const launcherHealth = await fetchJsonWithTimeout(
    launcherHealthEndpoint,
    AGENT_LAUNCHER_TIMEOUT_MS
  );
  if (!launcherHealth?.ok) {
    addDiagStep("VOICEINSIGHT_AGENT_WAKE", "retry", {
      launcherHealthEndpoint,
      error: "agent_launcher_unreachable",
      status: Number(launcherHealth?.status || 0),
      detailError: String(launcherHealth?.error || ""),
    });
    return {
      attempted: false,
      ready: false,
      reason: "agent_launcher_unreachable",
      status: Number(launcherHealth?.status || 0),
      error: String(launcherHealth?.error || ""),
    };
  }

  const wakeResult = await fetchJsonWithTimeout(launcherWakeEndpoint, AGENT_LAUNCHER_TIMEOUT_MS);
  if (!wakeResult?.ok || String(wakeResult?.payload?.status || "") !== "ok") {
    addDiagStep("VOICEINSIGHT_AGENT_WAKE", "error", {
      launcherWakeEndpoint,
      error: "agent_launcher_wake_failed",
      status: Number(wakeResult?.status || 0),
      detailError: String(wakeResult?.error || ""),
    });
    return {
      attempted: true,
      ready: false,
      reason: "agent_launcher_wake_failed",
      status: Number(wakeResult?.status || 0),
      error: String(wakeResult?.error || ""),
    };
  }
  addDiagStep("VOICEINSIGHT_AGENT_WAKE", "ok", {
    launcherWakeEndpoint,
    mode: String(wakeResult?.payload?.result?.code || ""),
  });

  const healthResult = await waitForVoiceInsightAgentHealthy(
    healthEndpoint,
    AGENT_WAKE_HEALTH_RETRY_DELAYS_MS
  );
  if (healthResult.ok) {
    return {
      attempted: true,
      ready: true,
      reason: "agent_wake_success",
      attempt: healthResult.attempt,
    };
  }

  addDiagStep("VOICEINSIGHT_AGENT_WAKE", "error", {
    launcherWakeEndpoint,
    error: "agent_wake_health_failed",
    status: Number(healthResult?.lastResult?.status || 0),
    detailError: String(healthResult?.lastResult?.error || ""),
  });
  return {
    attempted: true,
    ready: false,
    reason: "agent_wake_health_failed",
    status: Number(healthResult?.lastResult?.status || 0),
    error: String(healthResult?.lastResult?.error || ""),
  };
}

async function ensureVoiceInsightAgentReady(options = {}) {
  const strict = options?.strict === true;
  const apiBase = await resolveApiBase();
  if (!isLocalApiBase(apiBase)) {
    return {
      ready: true,
      skipped: true,
      reason: "remote_api_base",
    };
  }

  const healthEndpoint = new URL(AGENT_HEALTH_PATH, apiBase);
  addDiagStep("VOICEINSIGHT_AGENT", "start", {
    endpoint: healthEndpoint.toString(),
  });

  const initialHealth = await waitForVoiceInsightAgentHealthy(
    healthEndpoint.toString(),
    AGENT_HEALTH_RETRY_DELAYS_MS
  );
  if (initialHealth.ok) {
    addDiagStep("VOICEINSIGHT_AGENT", "ok", {
      endpoint: healthEndpoint.toString(),
      attempt: initialHealth.attempt,
    });
    await markVoiceInsightAgentHealthyNow();
    return {
      ready: true,
      skipped: false,
    };
  }

  const wakeResult = await tryWakeVoiceInsightAgent(apiBase, healthEndpoint.toString());
  if (wakeResult?.ready) {
    addDiagStep("VOICEINSIGHT_AGENT", "ok", {
      endpoint: healthEndpoint.toString(),
      attempt: Number(wakeResult?.attempt || 0),
      wokenByLauncher: true,
    });
    await markVoiceInsightAgentHealthyNow();
    return {
      ready: true,
      skipped: false,
      wokenByLauncher: true,
    };
  }

  const lastHealthyTs = await getVoiceInsightAgentLastHealthyTs();
  const installedLikely = lastHealthyTs > 0;
  const shouldOpenInstallGuide = !installedLikely;
  if (shouldOpenInstallGuide) {
    await triggerAgentInstallGuideOnce();
  }
  addDiagStep("VOICEINSIGHT_AGENT", "error", {
    endpoint: healthEndpoint.toString(),
    error: "agent_health_failed",
    status: Number(initialHealth?.lastResult?.status || 0),
    detailError: String(initialHealth?.lastResult?.error || ""),
  });
  addDiagStep("VOICEINSIGHT_AGENT", "retry", {
    endpoint: healthEndpoint.toString(),
    wakeAttempted: Boolean(wakeResult?.attempted),
    wakeReason: String(wakeResult?.reason || ""),
    wakeError: String(wakeResult?.error || ""),
    installGuideTriggered: shouldOpenInstallGuide,
    installedLikely,
  });

  if (strict) {
    throw new Error("agent_not_ready");
  }
  return {
    ready: false,
    skipped: false,
  };
}

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        resolve({});
        return;
      }
      resolve(result || {});
    });
  });
}

function setStorage(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}
