const DEBUG = true;
const LOCALE_STORAGE_KEY = "voiceInsightLocaleOverride";
const DOWNLOAD_TASK_KEY = "voiceInsightDownloadTask";
const DEFAULT_API_BASE = "https://www.voiceinsight.cloud";

let currentLocale = detectLocale();
const I18N = {
  zh: {
    app_title: "VoiceInsight",
    app_subtitle: "YouTube 字幕下载助手",
    lang_zh: "中文",
    lang_en: "EN",
    lang_toggle_aria: "语言切换",
    action_download: "下载字幕",
    action_cancel: "取消",
    action_open_caption_dir: "查看字幕",
    caption_saved_label: "查看字幕",
    caption_saved_prefix_a: "字幕已下载完成，请在“",
    caption_saved_download_word: "下载",
    caption_saved_prefix_b: "”目录中查看字幕文件。在",
    caption_saved_link_text: "VoiceInsight",
    caption_saved_suffix: "官网中设置您关注的关键词，即可自动追踪并分析你关注的同类视频。",
    notice_title: "使用说明：",
    notice_download_location:
      "请先打开 YouTube 视频页面，在对应视频页面中点击此插件下载字幕。",
    result_summary: "摘要",
    result_key_points: "要点",
    result_sentiment: "情绪",
    result_tags: "标签",
    status_prepare_captions: "正在准备字幕环境",
    progress_caption_download: "字幕下载中",
    progress_local_tool: "使用本地工具下载字幕",
    progress_refresh_caption: "正在刷新页面字幕信息",
    progress_fetch_page_caption: "从页面获取字幕",
    progress_dom_caption: "尝试读取字幕面板",
    status_download_complete: "字幕下载完成",
    status_download_complete_saved: "字幕下载完成，已保存到本地",
    model_info: "模型：{name} ({quant})",
    unknown: "未知",
    untitled_video: "未命名视频",
    warnings_prefix: "提示：",
    empty_key_points: "暂无要点",
    empty_tags: "暂无标签",
    sentiment_positive: "积极",
    sentiment_neutral: "中性",
    sentiment_negative: "消极",
    error_unexpected: "出现未知错误，请稍后重试。",
    error_open_captions: "打开下载目录失败，请稍后重试。",
    error_download_timeout: "字幕下载超时，请稍后重试。",
    error_download_failed: "字幕下载失败，请稍后重试。",
    error_captions_not_found: "该视频无字幕可下载。",
    error_caption_empty: "字幕解析失败，请稍后重试。",
    error_operation_timeout: "操作超时，请稍后重试。",
    error_network_suspended: "分析过程被系统中断，请保持窗口打开并重试。",
    error_open_youtube_tab: "请先打开一个 YouTube 视频页面。",
    error_no_active_tab: "未找到当前视频标签页，请重新打开视频。",
    error_caption_payload_mismatch: "页面字幕信息仍在加载，请稍后重试或刷新页面。",
    error_caption_extraction_unsupported: "当前页面无法直接读取字幕，已尝试备用方案。",
    error_failed_read_captions: "读取字幕失败，请稍后重试。",
    error_generic: "操作失败，请稍后重试。",
  },
  en: {
    app_title: "VoiceInsight",
    app_subtitle: "YouTube Subtitles  Downloader",
    lang_zh: "中文",
    lang_en: "EN",
    lang_toggle_aria: "Language",
    action_download: "Download Subtitles",
    action_cancel: "Cancel",
    action_open_caption_dir: "View Subtitles",
    caption_saved_label: "View Subtitles",
    caption_saved_prefix_a: "Subtitles are downloaded. Open your “",
    caption_saved_download_word: "Downloads",
    caption_saved_prefix_b: "” folder to view the subtitle file. In ",
    caption_saved_link_text: "VoiceInsight",
    caption_saved_suffix:
      " official website, set your keywords to automatically track and analyze similar videos.",
    notice_title: "How to use:",
    notice_download_location:
      "Open a YouTube video page first, then click this extension on that video page to download subtitles.",
    result_summary: "Summary",
    result_key_points: "Key Points",
    result_sentiment: "Sentiment",
    result_tags: "Tags",
    status_prepare_captions: "Preparing subtitles environment",
    progress_caption_download: "Downloading subtitles",
    progress_local_tool: "Using local tool to download subtitles",
    progress_refresh_caption: "Refreshing subtitle info",
    progress_fetch_page_caption: "Fetching subtitles from page",
    progress_dom_caption: "Reading subtitles panel",
    status_download_complete: "Subtitles downloaded.",
    status_download_complete_saved: "Subtitles downloaded and saved.",
    model_info: "Model: {name} ({quant})",
    unknown: "Unknown",
    untitled_video: "Untitled video",
    warnings_prefix: "Note: ",
    empty_key_points: "No key points yet",
    empty_tags: "No tags",
    sentiment_positive: "Positive",
    sentiment_neutral: "Neutral",
    sentiment_negative: "Negative",
    error_unexpected: "Unexpected error. Please try again.",
    error_open_captions: "Failed to open downloads folder. Please try again.",
    error_download_timeout: "Subtitle download timed out. Please try again.",
    error_download_failed: "Subtitle download failed. Please try again.",
    error_captions_not_found: "No subtitles are available for download for this video.",
    error_caption_empty: "Subtitle parsing failed. Please try again.",
    error_operation_timeout: "Operation timed out. Please try again.",
    error_network_suspended: "Process was interrupted. Keep the window open and try again.",
    error_open_youtube_tab: "Please open a YouTube video page first.",
    error_no_active_tab: "No active video tab found. Please reopen the video.",
    error_caption_payload_mismatch: "Subtitle info is still loading. Try again or refresh the page.",
    error_caption_extraction_unsupported: "This page doesn't support direct subtitle extraction.",
    error_failed_read_captions: "Failed to read subtitles. Please try again.",
    error_generic: "Operation failed. Please try again.",
  },
};

function detectLocale() {
  const raw =
    (Array.isArray(navigator.languages) && navigator.languages[0]) ||
    navigator.language ||
    "en";
  return raw.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function t(key, params) {
  const dict = I18N[currentLocale] || I18N.en;
  let template = dict[key] || I18N.en[key] || key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => {
    const value = params[token];
    return value === undefined || value === null ? "" : String(value);
  });
}

function containsChinese(text) {
  return /[\u4e00-\u9fff]/.test(String(text || ""));
}

const ZH_ERROR_KEYWORDS = [
  { pattern: /没有可用字幕|字幕暂不可用|该视频没有可用字幕|无可下载字幕轨道|无字幕可下载/, key: "error_captions_not_found" },
  { pattern: /字幕解析失败/, key: "error_caption_empty" },
  { pattern: /操作超时/, key: "error_operation_timeout" },
  { pattern: /分析过程被系统中断/, key: "error_network_suspended" },
  { pattern: /请先打开.*YouTube/, key: "error_open_youtube_tab" },
  { pattern: /未找到当前视频标签页/, key: "error_no_active_tab" },
  { pattern: /页面字幕信息仍在加载/, key: "error_caption_payload_mismatch" },
  { pattern: /当前页面无法直接读取字幕/, key: "error_caption_extraction_unsupported" },
  { pattern: /读取字幕失败/, key: "error_failed_read_captions" },
  { pattern: /操作失败/, key: "error_generic" },
];

function applyI18n() {
  document.documentElement.lang = currentLocale === "zh" ? "zh-CN" : "en";
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
}

const analyzeButton = document.getElementById("analyzeBtn");
const complianceNoteEl = document.getElementById("complianceNote");
const statusEl = document.getElementById("status");
const progressEl = document.getElementById("progress");
const progressBarEl = document.getElementById("progressBar");
const progressTextEl = document.getElementById("progressText");
const cancelDownloadBtn = document.getElementById("cancelDownload");
const errorEl = document.getElementById("error");
const resultEl = document.getElementById("result");
const summaryEl = document.getElementById("summary");
const keyPointsEl = document.getElementById("keyPoints");
const sentimentEl = document.getElementById("sentiment");
const tagsEl = document.getElementById("tags");
const warningsEl = document.getElementById("warnings");
const videoTitleEl = document.getElementById("videoTitle");
const modelInfoEl = document.getElementById("modelInfo");
const captionSavedEl = document.getElementById("captionSaved");
const openCaptionDirBtn = document.getElementById("openCaptionDir");
const langZhBtn = document.getElementById("langZh");
const langEnBtn = document.getElementById("langEn");
const voiceInsightInlineLinkEl = document.getElementById("voiceInsightInlineLink");

initLocale();
initDownloadTaskWatcher();

analyzeButton.addEventListener("click", () => {
  handleDownloadClick().catch((error) => {
    setError(formatErrorMessage(error) || t("error_unexpected"));
  });
});

if (cancelDownloadBtn) {
  cancelDownloadBtn.addEventListener("click", () => {
    cancelDownloadTask().catch((error) => {
      setError(formatErrorMessage(error) || t("error_unexpected"));
    });
  });
}

let lastCaptionDir = "";

if (openCaptionDirBtn) {
  openCaptionDirBtn.addEventListener("click", () => {
    if (!lastCaptionDir) return;
    openCaptionDirectory(lastCaptionDir).catch((error) => {
      setError(formatErrorMessage(error) || t("error_open_captions"));
    });
  });
}

if (langZhBtn) {
  langZhBtn.addEventListener("click", () => setLocale("zh"));
}

if (langEnBtn) {
  langEnBtn.addEventListener("click", () => setLocale("en"));
}

if (voiceInsightInlineLinkEl) {
  voiceInsightInlineLinkEl.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.tabs.create({ url: DEFAULT_API_BASE });
  });
}



async function handleDownloadClick() {
  await startDownloadTask();
}

function initLocale() {
  getStorage([LOCALE_STORAGE_KEY]).then((stored) => {
    const override = stored?.[LOCALE_STORAGE_KEY];
    if (override === "zh" || override === "en") {
      currentLocale = override;
    }
    applyI18n();
    updateLangToggle();
  });
}

function setLocale(nextLocale) {
  if (nextLocale !== "zh" && nextLocale !== "en") return;
  if (currentLocale === nextLocale) return;
  currentLocale = nextLocale;
  applyI18n();
  updateLangToggle();
  rerenderLocaleSensitiveState();
  setStorage({ [LOCALE_STORAGE_KEY]: nextLocale });
}

function rerenderLocaleSensitiveState() {
  if (!currentDownloadState) return;
  applyDownloadState(currentDownloadState).catch(() => undefined);
}

function updateLangToggle() {
  if (!langZhBtn || !langEnBtn) return;
  const isZh = currentLocale === "zh";
  langZhBtn.classList.toggle("active", isZh);
  langEnBtn.classList.toggle("active", !isZh);
  langZhBtn.setAttribute("aria-pressed", String(isZh));
  langEnBtn.setAttribute("aria-pressed", String(!isZh));
}

function setStatus(message, options = {}) {
  const text = typeof message === "string" ? message : "";
  statusEl.textContent = text;
  statusEl.classList.toggle("hidden", !text);
  if (typeof options.progress === "number") {
    showProgress(true);
    setProgress(options.progress);
    return;
  }
  if (!options.keepProgress) {
    showProgress(false);
  }
}

function clearStatus(keepProgress = false) {
  setStatus("", { keepProgress });
}

function showProgress(visible) {
  if (!progressEl) return;
  progressEl.classList.toggle("hidden", !visible);
}

function setCancelVisible(visible) {
  if (!cancelDownloadBtn) return;
  cancelDownloadBtn.classList.toggle("hidden", !visible);
}

function setProgressOnly(value) {
  showProgress(true);
  setProgress(value);
}

function setProgress(value) {
  if (!progressBarEl || !progressTextEl) return;
  const percent = clampPercent(value);
  progressBarEl.style.width = `${percent}%`;
  progressTextEl.textContent = `${percent}%`;
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  clearStatus();
  showProgress(false);
  setCancelVisible(false);
  setBusy(false);
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function setBusy(isBusy) {
  analyzeButton.disabled = isBusy;
}

function setUsageNoteVisible(visible) {
  if (!complianceNoteEl) return;
  complianceNoteEl.classList.toggle("hidden", !visible);
}

function setCaptionSaveInfo(dir) {
  if (!captionSavedEl) return;
  if (!dir) {
    clearCaptionSaveInfo();
    return;
  }
  lastCaptionDir = dir;
  captionSavedEl.classList.remove("hidden");
  if (openCaptionDirBtn) {
    openCaptionDirBtn.disabled = false;
  }
  setUsageNoteVisible(false);
}

function clearCaptionSaveInfo() {
  if (!captionSavedEl) return;
  lastCaptionDir = "";
  captionSavedEl.classList.add("hidden");
  if (openCaptionDirBtn) {
    openCaptionDirBtn.disabled = true;
  }
  setUsageNoteVisible(true);
}

function startProgressTicker(options) {
  const label = typeof options.label === "string" ? options.label : "";
  const durationMs = Number.isFinite(options.durationMs)
    ? options.durationMs
    : 45000;
  const maxPercent = Number.isFinite(options.maxPercent)
    ? options.maxPercent
    : 92;
  const startPercent = Number.isFinite(options.startPercent)
    ? options.startPercent
    : 3;
  const tickMs = Number.isFinite(options.tickMs) ? options.tickMs : 400;
  const renderStatus = options.renderStatus !== false;
  let currentLabel = label;
  let active = true;
  const startedAt = Date.now();
  if (!renderStatus) {
    clearStatus(true);
  }
  const update = () => {
    if (!active) return;
    const elapsed = Date.now() - startedAt;
    const ratio = Math.min(elapsed / durationMs, 1);
    const eased = 1 - Math.pow(1 - ratio, 2);
    const percent = Math.floor(
      startPercent + (maxPercent - startPercent) * eased
    );
    if (renderStatus) {
      setStatus(`${currentLabel} ${percent}%`, { progress: percent });
    } else {
      setProgressOnly(percent);
    }
    if (ratio >= 1) {
      clearInterval(timer);
    }
  };
  const timer = setInterval(update, tickMs);
  update();
  return {
    setLabel(nextLabel) {
      if (typeof nextLabel === "string" && nextLabel.trim()) {
        currentLabel = nextLabel.trim();
      }
    },
    stop(finalPercent) {
      active = false;
      clearInterval(timer);
      if (Number.isFinite(finalPercent)) {
        if (renderStatus) {
          setStatus(`${currentLabel} ${finalPercent}%`, { progress: finalPercent });
        } else {
          setProgressOnly(finalPercent);
        }
      }
    },
  };
}

function debugLog(...args) {
  if (!DEBUG) return;
  console.log("[yt-analyzer]", ...args);
}

function clearResult() {
  resultEl.classList.add("hidden");
  summaryEl.textContent = "";
  keyPointsEl.innerHTML = "";
  sentimentEl.textContent = "";
  tagsEl.innerHTML = "";
  warningsEl.textContent = "";
  warningsEl.classList.add("hidden");
  videoTitleEl.textContent = "";
  modelInfoEl.textContent = "";
  clearCaptionSaveInfo();
}

function formatErrorMessage(error) {
  const raw = String(error?.message || error || "");
  if (currentLocale === "en" && containsChinese(raw)) {
    for (const entry of ZH_ERROR_KEYWORDS) {
      if (entry.pattern.test(raw)) {
        return t(entry.key);
      }
    }
    return t("error_generic");
  }
  const lower = raw.toLowerCase();
  if (lower.includes("download_timeout")) {
    return t("error_download_timeout");
  }
  if (lower.includes("download_failed")) {
    return t("error_download_failed");
  }
  if (
    lower.includes("captions_not_found") ||
    lower.includes("no captions") ||
    lower.includes("no_caption_tracks") ||
    lower.includes("caption_track_missing_url") ||
    lower.includes("transcript_unavailable") ||
    lower.includes("transcript_panel_not_found") ||
    lower.includes("transcript_empty")
  ) {
    return t("error_captions_not_found");
  }
  if (lower.includes("caption text is empty")) {
    return t("error_caption_empty");
  }
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return t("error_operation_timeout");
  }
  if (lower.includes("err_network_io_suspended") || lower.includes("failed to fetch")) {
    return t("error_network_suspended");
  }
  if (lower.includes("please open a youtube video tab")) {
    return t("error_open_youtube_tab");
  }
  if (lower.includes("no active tab")) {
    return t("error_no_active_tab");
  }
  if (
    lower.includes("caption_payload_mismatch") ||
    lower.includes("player_response_mismatch")
  ) {
    return t("error_caption_payload_mismatch");
  }
  if (lower.includes("this page does not support caption extraction")) {
    return t("error_caption_extraction_unsupported");
  }
  if (lower.includes("failed to read captions")) {
    return t("error_failed_read_captions");
  }
  return t("error_generic");
}

function renderResult(analysis, video, model) {
  if (!analysis) return;
  resultEl.classList.remove("hidden");
  videoTitleEl.textContent = video.title || t("untitled_video");
  modelInfoEl.textContent = t("model_info", {
    name: model?.name ?? t("unknown"),
    quant: model?.quantization ?? t("unknown"),
  });
  summaryEl.textContent = analysis.summary || "";

  renderList(keyPointsEl, analysis.key_points || []);
  sentimentEl.textContent = formatSentiment(analysis.sentiment);
  renderTags(analysis.tags || []);

  if (Array.isArray(analysis.warnings) && analysis.warnings.length > 0) {
    warningsEl.textContent = `${t("warnings_prefix")}${analysis.warnings.join(", ")}`;
    warningsEl.classList.remove("hidden");
  }
}

function renderList(container, items) {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = t("empty_key_points");
    container.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function renderTags(tags) {
  tagsEl.innerHTML = "";
  if (!tags || tags.length === 0) {
    tagsEl.textContent = t("empty_tags");
    return;
  }
  tags.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tag;
    tagsEl.appendChild(span);
  });
}

function formatSentiment(sentiment) {
  if (!sentiment) return t("unknown");
  const rawLabel = sentiment.label ?? "neutral";
  const labelMap = {
    positive: t("sentiment_positive"),
    neutral: t("sentiment_neutral"),
    negative: t("sentiment_negative"),
  };
  const label = labelMap[rawLabel] || rawLabel;
  const score =
    typeof sentiment.score === "number"
      ? sentiment.score.toFixed(2)
      : "0.00";
  return `${label} (${score})`;
}

function requestCaptions(preferredLanguage) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const tab = tabs[0];
      if (!tab?.id) {
        reject(new Error("no active tab found"));
        return;
      }
      if (!isYouTubeUrl(tab.url || "")) {
        reject(new Error("please open a youtube video tab"));
        return;
      }
      sendCaptionMessage(tab.id, preferredLanguage)
        .then((data) => resolve({ ...data, tabId: tab.id }))
        .catch(async (error) => {
          if (String(error?.message || "").includes("caption_payload_mismatch")) {
            reject(error);
            return;
          }
          if (!shouldInjectContentScript(error)) {
            reject(new Error("This page does not support caption extraction."));
            return;
          }
          try {
            await injectContentScript(tab.id);
            const retry = await sendCaptionMessage(tab.id, preferredLanguage);
            resolve({ ...retry, tabId: tab.id });
          } catch (retryError) {
            reject(
              new Error(
                retryError?.message || "This page does not support caption extraction."
              )
            );
          }
        });
    });
  });
}

function sendCaptionMessage(tabId, preferredLanguage) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "GET_CAPTIONS", preferredLanguage },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          const errorCode = response?.error ?? "unknown";
          if (errorCode === "player_response_mismatch") {
            reject(new Error("caption_payload_mismatch"));
            return;
          }
          reject(new Error(`failed to read captions (${errorCode})`));
          return;
        }
        resolve(response.data);
      }
    );
  });
}

function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      { target: { tabId }, files: ["contentScript.js"] },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });
}

function shouldInjectContentScript(error) {
  const message = String(error?.message || "");
  return (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection")
  );
}

function isYouTubeUrl(url) {
  return (
    url.includes("youtube.com/") ||
    url.includes("youtu.be/")
  );
}

function getActiveTabInfo() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const tab = tabs[0];
      if (!tab?.id) {
        reject(new Error("no active tab found"));
        return;
      }
      const url = tab.url || "";
      if (!isYouTubeUrl(url)) {
        reject(new Error("please open a youtube video tab"));
        return;
      }
      resolve({ tabId: tab.id, url, title: tab.title || "" });
    });
  });
}

function extractYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }
  return "";
}

async function openCaptionDirectory() {
  try {
    if (chrome.downloads?.showDefaultFolder) {
      chrome.downloads.showDefaultFolder();
      return;
    }
  } catch {
    // ignore
  }
  try {
    chrome.tabs.create({ url: "chrome://downloads" });
  } catch {
    // ignore
  }
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

let currentDownloadState = null;

function initDownloadTaskWatcher() {
  refreshDownloadTaskState().catch(() => undefined);
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (!changes[DOWNLOAD_TASK_KEY]) return;
      const next = changes[DOWNLOAD_TASK_KEY].newValue;
      applyDownloadState(next).catch(() => undefined);
    });
  }
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "DOWNLOAD_STATE") {
        applyDownloadState(message.state).catch(() => undefined);
      }
    });
  }
}

async function refreshDownloadTaskState() {
  const stored = await getStorage([DOWNLOAD_TASK_KEY]);
  const state = stored?.[DOWNLOAD_TASK_KEY];
  if (state) {
    await applyDownloadState(state);
  }
}

async function applyDownloadState(state) {
  if (!state) return;
  currentDownloadState = state;
  let activeTab = null;
  try {
    activeTab = await getActiveTabInfo();
  } catch {
    activeTab = null;
  }
  if (state.tabId && activeTab && state.tabId !== activeTab.tabId) {
    clearError();
    clearStatus();
    showProgress(false);
    setCancelVisible(false);
    setBusy(false);
    return;
  }
  if (activeTab) {
    const activeVideoId = extractYouTubeVideoId(activeTab.url);
    const stateVideoId =
      state?.video?.videoId ||
      extractYouTubeVideoId(typeof state?.video?.url === "string" ? state.video.url : "");
    if (activeVideoId && stateVideoId && activeVideoId !== stateVideoId) {
      clearError();
      clearStatus();
      showProgress(false);
      setCancelVisible(false);
      setBusy(false);
      return;
    }
  }

  const status = state.status;
  const statusKey = typeof state.statusKey === "string" ? state.statusKey : "";
  const translatedStatusText = statusKey ? t(statusKey) : "";
  const rawStatusText =
    typeof state.statusText === "string" && state.statusText.trim()
      ? state.statusText.trim()
      : "";
  const statusText = translatedStatusText || rawStatusText;
  const progress =
    typeof state.progress === "number" ? state.progress : undefined;
  setUsageNoteVisible(status !== "success");

  if (status === "running") {
    clearError();
    setBusy(true);
    clearStatus(true);
    if (typeof progress === "number") {
      setProgressOnly(progress);
    } else {
      showProgress(true);
    }
    setCancelVisible(true);
    if (state.savedDir) {
      setCaptionSaveInfo(state.savedDir);
    } else {
      clearCaptionSaveInfo();
    }
    return;
  }

  if (status === "success") {
    clearError();
    setBusy(false);
    setCancelVisible(false);
    if (statusText) {
      setStatus(statusText, { progress: 100 });
    } else {
      setStatus(t("status_download_complete"), { progress: 100 });
    }
    if (state.savedDir) {
      setCaptionSaveInfo(state.savedDir);
    }
    return;
  }

  if (status === "error") {
    setCancelVisible(false);
    setBusy(false);
    const message = formatErrorMessage(state.error || statusText || t("error_generic"));
    setError(message || t("error_unexpected"));
    return;
  }

  if (status === "idle") {
    setBusy(false);
    clearStatus();
    showProgress(false);
    setCancelVisible(false);
  }
}

function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function cancelDownloadTask() {
  clearError();
  const response = await sendRuntimeMessage({ type: "CANCEL_DOWNLOAD" });
  if (response?.error) {
    throw new Error(response.error);
  }
  if (response?.state) {
    await applyDownloadState(response.state);
    return;
  }
  setBusy(false);
  clearStatus();
  showProgress(false);
  setCancelVisible(false);
}

async function startDownloadTask() {
  let activeTab = null;
  try {
    activeTab = await getActiveTabInfo();
  } catch {
    activeTab = null;
  }
  if (currentDownloadState?.status === "running") {
    if (activeTab) {
      const activeVideoId = extractYouTubeVideoId(activeTab.url);
      const stateVideoId =
        currentDownloadState?.video?.videoId ||
        extractYouTubeVideoId(
          typeof currentDownloadState?.video?.url === "string"
            ? currentDownloadState.video.url
            : ""
        );
      if (!stateVideoId || !activeVideoId || stateVideoId === activeVideoId) {
        await applyDownloadState(currentDownloadState);
        return;
      }
      try {
        await sendRuntimeMessage({ type: "CANCEL_DOWNLOAD" });
      } catch {
        // ignore cancel errors and continue starting a new task
      }
    } else {
      await applyDownloadState(currentDownloadState);
      return;
    }
  }
  clearError();
  clearResult();
  setBusy(true);
  const response = await sendRuntimeMessage({ type: "START_DOWNLOAD" });
  if (response?.error) {
    throw new Error(response.error);
  }
  if (response?.state) {
    await applyDownloadState(response.state);
  }
}

async function fetchText(url) {
  debugLog("fetch captions", url);
  let response;
  try {
    response = await fetch(url, { credentials: "include" });
  } catch (error) {
    debugLog("caption fetch failed", error?.message || error);
    return "";
  }
  const contentType = response.headers.get("content-type") || "";
  const payload = await response.text();
  debugLog("caption response", {
    status: response.status,
    contentType,
    length: payload.length,
  });
  if (!response.ok) {
    return "";
  }
  return payload;
}

async function fetchCaptionText(baseUrl) {
  const basePayload = await fetchText(baseUrl);
  const baseParsed = parseCaptionPayload(basePayload);
  if (baseParsed) return baseParsed;

  const hasFmt = baseUrl.includes("fmt=");
  if (hasFmt) {
    return "";
  }

  const formats = ["vtt", "srv3", "json3", "ttml"];
  for (const fmt of formats) {
    const url = ensureCaptionUrl(baseUrl, fmt);
    const payload = await fetchText(url);
    const parsed = parseCaptionPayload(payload);
    if (parsed) return parsed;
  }
  return "";
}

async function fetchCaptionTextWithFallback(baseUrl, tabId) {
  const direct = await fetchCaptionText(baseUrl);
  if (direct) return direct;
  if (!tabId) return "";
  return await fetchCaptionTextViaPage(baseUrl, tabId);
}

async function fetchCaptionTextViaPage(baseUrl, tabId) {
  debugLog("fallback to page fetch");
  const hasFmt = baseUrl.includes("fmt=");
  const formats = hasFmt ? [null] : [null, "vtt", "srv3", "json3", "ttml"];
  for (const fmt of formats) {
    const url = fmt ? ensureCaptionUrl(baseUrl, fmt) : baseUrl;
    let payload = "";
    try {
      payload = await fetchTextViaPage(tabId, url);
    } catch (error) {
      debugLog("page fetch failed", error?.message || error);
      continue;
    }
    const parsed = parseCaptionPayload(payload);
    if (parsed) return parsed;
  }
  return "";
}

async function fetchCaptionTextByVideo(videoId, language, isAutoGenerated, tabId) {
  if (!videoId) return "";
  const lang = language || "en";
  const params = new URLSearchParams({ v: videoId, lang });
  if (isAutoGenerated) {
    params.set("kind", "asr");
  }
  const baseUrl = `https://www.youtube.com/api/timedtext?${params.toString()}`;
  debugLog("fallback direct timedtext", baseUrl);
  return await fetchCaptionTextWithFallback(baseUrl, tabId);
}


function fetchTextViaPage(tabId, url) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        world: "MAIN",
        args: [url],
        func: async (targetUrl) => {
          try {
            const response = await fetch(targetUrl, { credentials: "include" });
            const contentType = response.headers.get("content-type") || "";
            const text = await response.text();
            return {
              ok: response.ok,
              status: response.status,
              contentType,
              text,
            };
          } catch (error) {
            return { ok: false, error: String(error?.message || error) };
          }
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        const result = results?.[0]?.result;
        debugLog("page fetch result", result);
        if (!result?.ok) {
          reject(new Error(result?.error || "Page fetch failed"));
          return;
        }
        resolve(result.text || "");
      }
    );
  });
}

async function fetchTranscriptFromDom(tabId) {
  if (!tabId) return "";
  try {
    const response = await sendTranscriptMessage(tabId);
    const transcript = response?.transcript ?? "";
    return transcript;
  } catch (error) {
    debugLog("dom transcript failed", error?.message || error);
    return "";
  }
}

async function fetchCaptionsFallback({ captionPayload, tabInfo, language, video }) {
  const tabId = tabInfo?.tabId;
  const track = captionPayload?.track;
  if (track?.baseUrl && tabId) {
    const text = await fetchCaptionTextWithFallback(track.baseUrl, tabId);
    if (text) {
      return {
        text,
        language: track.languageCode || language || "en",
        auto: track.isAutoGenerated ?? false,
      };
    }
  }
  const domTranscript = await fetchTranscriptFromDom(tabId);
  if (domTranscript) {
    return { text: domTranscript, language: language || "en", auto: true };
  }
  const manual = await fetchCaptionTextByVideo(
    video?.videoId || "",
    language || "en",
    false,
    tabId
  );
  if (manual) {
    return { text: manual, language: language || "en", auto: false };
  }
  const auto = await fetchCaptionTextByVideo(
    video?.videoId || "",
    language || "en",
    true,
    tabId
  );
  if (auto) {
    return { text: auto, language: language || "en", auto: true };
  }
  return null;
}

function sendTranscriptMessage(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "GET_TRANSCRIPT_DOM" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        if (response?.debug) {
          debugLog("dom transcript debug", response.debug);
        }
        reject(new Error(response?.error || "Transcript not available"));
        return;
      }
      resolve(response.data);
    });
  });
}

function ensureCaptionUrl(baseUrl, fmt) {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("fmt", fmt);
    return url.toString();
  } catch {
    if (baseUrl.includes("fmt=")) {
      return baseUrl.replace(/fmt=[^&]+/g, `fmt=${fmt}`);
    }
    return baseUrl.includes("?")
      ? `${baseUrl}&fmt=${fmt}`
      : `${baseUrl}?fmt=${fmt}`;
  }
}

function parseVttToText(vtt) {
  const lines = vtt.split(/\r?\n/);
  const output = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("WEBVTT")) continue;
    if (trimmed.startsWith("NOTE")) continue;
    if (trimmed.includes("-->")) continue;
    if (/^\d+$/.test(trimmed)) continue;
    const decoded = decodeEntities(trimmed.replace(/<[^>]+>/g, ""));
    const normalized = decoded.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    if (output[output.length - 1] === normalized) continue;
    output.push(normalized);
  }
  return normalizeTranscriptLines(output);
}

function parseCaptionPayload(payload) {
  const trimmed = payload.trim();
  debugLog("caption payload preview", trimmed.slice(0, 140));
  if (!trimmed) return "";
  if (trimmed.startsWith("WEBVTT")) return parseVttToText(payload);
  if (trimmed.startsWith("{")) return parseJson3ToText(payload);
  if (trimmed.startsWith("<")) {
    return parseSrv3ToText(payload) || parseTtmlToText(payload);
  }
  return parseVttToText(payload);
}

function parseSrv3ToText(xmlText) {
  if (!xmlText || !xmlText.trim().startsWith("<")) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const nodes = Array.from(doc.getElementsByTagName("text"));
    const lines = nodes.map((node) => decodeEntities(node.textContent || ""));
    return normalizeTranscriptLines(lines);
  } catch {
    return "";
  }
}

function parseTtmlToText(xmlText) {
  if (!xmlText || !xmlText.trim().startsWith("<")) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const nodes = Array.from(doc.getElementsByTagName("p"));
    const lines = nodes.map((node) => decodeEntities(node.textContent || ""));
    return normalizeTranscriptLines(lines);
  } catch {
    return "";
  }
}

function parseJson3ToText(jsonText) {
  if (!jsonText || jsonText.trim()[0] !== "{") return "";
  try {
    const data = JSON.parse(jsonText);
    const events = Array.isArray(data?.events) ? data.events : [];
    const lines = [];
    for (const event of events) {
      if (!Array.isArray(event?.segs)) continue;
      const line = event.segs
        .map((seg) => decodeEntities(seg.utf8 || ""))
        .join("");
      if (line) lines.push(line);
    }
    return normalizeTranscriptLines(lines);
  } catch {
    return "";
  }
}

function normalizeTranscriptLines(lines) {
  if (!Array.isArray(lines)) return "";
  const output = [];
  for (const line of lines) {
    const normalized = String(line).replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    if (output[output.length - 1] === normalized) continue;
    output.push(normalized);
  }
  return output.join(" ");
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
