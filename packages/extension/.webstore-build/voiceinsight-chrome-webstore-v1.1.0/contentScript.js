const NAVIGATION_NOTIFY_DEBOUNCE_MS = 260;

let notifyTimer = null;
let lastNotifiedVideoId = "";
let lastNotifiedUrl = "";

function normalizeUrl(value) {
  try {
    return String(new URL(String(value || "")).toString());
  } catch {
    return String(value || "").trim();
  }
}

function extractVideoIdFromLocation(url) {
  try {
    const parsed = new URL(String(url || ""));
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace(/^\/+/, "").split("/")[0] || "";
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
      const liveIndex = parts.indexOf("live");
      if (liveIndex !== -1 && parts[liveIndex + 1]) {
        return parts[liveIndex + 1];
      }
      return "";
    }
  } catch {
    return "";
  }
  return "";
}

function buildActiveVideoSnapshot() {
  const url = normalizeUrl(window.location.href);
  const videoId = extractVideoIdFromLocation(url);
  return {
    videoId,
    url,
    at: Date.now(),
  };
}

function notifyActiveVideoChange(source) {
  const snapshot = buildActiveVideoSnapshot();
  if (
    snapshot.videoId === lastNotifiedVideoId &&
    snapshot.url === lastNotifiedUrl
  ) {
    return;
  }
  lastNotifiedVideoId = snapshot.videoId;
  lastNotifiedUrl = snapshot.url;

  try {
    chrome.runtime.sendMessage({
      type: "VI_ACTIVE_VIDEO_CHANGED",
      videoId: snapshot.videoId,
      url: snapshot.url,
      at: snapshot.at,
      source: String(source || "navigation"),
    });
  } catch {
    // Ignore errors when no popup/background listener is active.
  }
}

function scheduleActiveVideoNotify(source) {
  if (notifyTimer) {
    clearTimeout(notifyTimer);
  }
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    notifyActiveVideoChange(source);
  }, NAVIGATION_NOTIFY_DEBOUNCE_MS);
}

function markNavigation(source) {
  scheduleActiveVideoNotify(source);
}

document.addEventListener("yt-navigate-start", () => markNavigation("yt_start"), true);
document.addEventListener("yt-navigate-finish", () => markNavigation("yt_finish"), true);
document.addEventListener("yt-page-data-updated", () => markNavigation("yt_page_data"), true);
window.addEventListener("popstate", () => markNavigation("popstate"));
window.addEventListener("hashchange", () => markNavigation("hashchange"));

markNavigation("init");
