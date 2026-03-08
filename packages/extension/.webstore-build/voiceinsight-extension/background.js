const DOWNLOAD_TASK_KEY = "voiceInsightDownloadTask";

const DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_LANGUAGE = "en";
const DOWNLOADS_PLACEHOLDER = "__DOWNLOADS__";

let runningTask = null;

function createAbortError() {
  const error = new Error("download_cancelled");
  error.name = "AbortError";
  return error;
}

function isAbortError(error) {
  if (!error) return false;
  if (error.name === "AbortError") return true;
  const message = String(error?.message || "");
  return message.includes("download_cancelled") || message.includes("abort");
}

function throwIfAborted(task) {
  if (!task) return;
  if (runningTask !== task) throw createAbortError();
  if (task.cancelled) throw createAbortError();
  if (task.controller?.signal?.aborted) throw createAbortError();
}

function debugLog(...args) {
  console.log("[yt-analyzer][bg]", ...args);
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

async function getTaskState() {
  const stored = await getStorage([DOWNLOAD_TASK_KEY]);
  return stored?.[DOWNLOAD_TASK_KEY] || null;
}

async function updateTaskState(patch, task) {
  if (task) {
    throwIfAborted(task);
  }
  const existing = (await getTaskState()) || {};
  const next = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  if (task?.id) {
    next.taskId = task.id;
  }
  await setStorage({ [DOWNLOAD_TASK_KEY]: next });
  try {
    chrome.runtime.sendMessage({ type: "DOWNLOAD_STATE", state: next });
  } catch {
    // ignore broadcast errors (e.g. no listeners)
  }
  return next;
}

async function resetTaskState(patch = {}) {
  await updateTaskState({
    status: "idle",
    progress: 0,
    statusKey: "",
    statusText: "",
    error: "",
    savedDir: "",
    taskId: "",
    tabId: null,
    video: null,
    startedAt: 0,
    ...patch,
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "START_DOWNLOAD") {
    void handleStartDownload().then(
      (state) => sendResponse({ state }),
      (error) => sendResponse({ error: error?.message || String(error) })
    );
    return true;
  }
  if (message?.type === "CANCEL_DOWNLOAD") {
    void handleCancelDownload().then(
      (state) => sendResponse({ state }),
      (error) => sendResponse({ error: error?.message || String(error) })
    );
    return true;
  }
  if (message?.type === "GET_DOWNLOAD_STATE") {
    void getTaskState().then((state) => sendResponse({ state }));
    return true;
  }
  return false;
});

async function handleStartDownload() {
  const tabInfo = await getActiveTabInfo();
  const tabId = tabInfo.tabId;
  if (runningTask && !runningTask.cancelled) {
    if (runningTask.tabId === tabId) {
      const state = await getTaskState();
      return state || {};
    }
    throw new Error("download_task_running");
  }

  const startedAt = Date.now();
  const task = {
    id: `${startedAt}-${Math.random().toString(16).slice(2)}`,
    tabId,
    controller: new AbortController(),
    cancelled: false,
    promise: null,
  };
  runningTask = task;
  const videoId = extractYouTubeVideoId(tabInfo.url) || "";
  await updateTaskState(
    {
      status: "running",
      progress: 5,
      statusKey: "status_prepare_captions",
      error: "",
      savedDir: "",
      tabId,
      taskId: task.id,
      video: {
        title: tabInfo.title || "",
        url: tabInfo.url || "",
        videoId,
      },
      startedAt,
    },
    task
  );

  const promise = runDownloadTask(tabInfo, task)
    .catch((error) => {
      if (!isAbortError(error)) {
        debugLog("task failed", error?.message || error);
      }
      return error;
    })
    .finally(() => {
      if (runningTask === task) {
        runningTask = null;
      }
    });

  task.promise = promise;

  const state = await getTaskState();
  return state || {};
}

async function handleCancelDownload() {
  if (runningTask) {
    runningTask.cancelled = true;
    if (runningTask.controller && !runningTask.controller.signal.aborted) {
      runningTask.controller.abort();
    }
  }
  runningTask = null;
  await resetTaskState();
  const state = await getTaskState();
  return state || {};
}

async function runDownloadTask(tabInfo, task) {
  const signal = task?.controller?.signal;
  try {
    await updateTaskState(
      { statusKey: "status_prepare_captions", progress: 8 },
      task
    );

    const currentVideoId = extractYouTubeVideoId(tabInfo.url) || "";
    const video = {
      videoId: currentVideoId,
      title: tabInfo.title || "",
      url: currentVideoId
        ? `https://www.youtube.com/watch?v=${currentVideoId}`
        : tabInfo.url,
    };

    await updateTaskState(
      { statusKey: "progress_caption_download", progress: 20 },
      task
    );

    await updateTaskState(
      { statusKey: "progress_dom_caption", progress: 55 },
      task
    );

    const domTranscript = await fetchTranscriptFromDomWithRetry(
      tabInfo.tabId,
      signal,
      task
    );
    const transcript = String(domTranscript?.transcript || "").trim();
    if (!transcript) {
      throw new Error("captions_not_found");
    }

    const captionLanguage = domTranscript?.languageCode || DEFAULT_LANGUAGE;
    const captionAuto = true;
    const captionTitle = normalizeVideoTitle(
      String(domTranscript?.title || "").trim() || video.title || ""
    );

    await updateTaskState(
      { statusKey: "status_download_complete", progress: 85 },
      task
    );
    const downloadId = await saveCaptionsToDownloads({
      text: transcript,
      url: video.url,
      title: captionTitle,
      language: captionLanguage,
      auto: captionAuto,
    });
    await showDownloadItem(downloadId);

    await updateTaskState(
      {
        status: "success",
        progress: 100,
        statusKey: "status_download_complete",
        savedDir: DOWNLOADS_PLACEHOLDER,
        downloadId,
      },
      task
    );
  } catch (error) {
    if (isAbortError(error)) {
      if (runningTask === task) {
        await resetTaskState();
      }
      return;
    }
    const message = error instanceof Error ? error.message : String(error || "");
    await updateTaskState(
      {
        status: "error",
        progress: 100,
        error: message,
      },
      task
    );
    throw error;
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    let onAbort;
    const timer = setTimeout(() => {
      if (signal && onAbort) {
        signal.removeEventListener("abort", onAbort);
      }
      resolve();
    }, ms);
    if (!signal) return;
    if (signal.aborted) {
      clearTimeout(timer);
      reject(createAbortError());
      return;
    }
    onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(createAbortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function isYouTubeUrl(url) {
  return url.includes("youtube.com/") || url.includes("youtu.be/");
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

async function fetchJson(url, options = {}, signal) {
  const response = await fetch(url, { ...options, signal });
  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return null;
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON response.");
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status}`);
  }
  return data;
}

function downloadWithChrome(url, filename, saveAs) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      { url, filename, saveAs: Boolean(saveAs) },
      (downloadId) => {
        if (chrome.runtime.lastError || !downloadId) {
          reject(new Error(chrome.runtime.lastError?.message || "download_failed"));
          return;
        }
        resolve(downloadId);
      }
    );
  });
}

function waitForDownloadComplete(downloadId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.downloads.onChanged.removeListener(onChanged);
      reject(new Error("download_timeout"));
    }, DOWNLOAD_TIMEOUT_MS);

    const onChanged = (delta) => {
      if (delta.id !== downloadId) return;
      if (delta.error) {
        clearTimeout(timeout);
        chrome.downloads.onChanged.removeListener(onChanged);
        reject(new Error("download_failed"));
        return;
      }
      if (delta.state && delta.state.current === "complete") {
        clearTimeout(timeout);
        chrome.downloads.onChanged.removeListener(onChanged);
        resolve();
      }
    };
    chrome.downloads.onChanged.addListener(onChanged);
  });
}

async function fetchTranscriptFromDomWithRetry(tabId, signal, task) {
  const delays = [0, 600, 1200];
  let lastError = "transcript_unavailable";
  for (let i = 0; i < delays.length; i += 1) {
    const delay = delays[i];
    if (delay > 0) {
      await sleep(delay, signal);
    }
    try {
      debugLog("dom transcript attempt", i + 1);
      throwIfAborted(task);
      const result = await sendTranscriptMessage(tabId);
      throwIfAborted(task);
      const transcript = String(result?.transcript || "").trim();
      if (!transcript) {
        debugLog("dom transcript empty", i + 1);
        lastError = "transcript_empty";
        continue;
      }
      return {
        transcript,
        languageCode: result?.languageCode || DEFAULT_LANGUAGE,
      };
    } catch (error) {
      lastError = String(error?.message || error);
      debugLog("dom transcript error", i + 1, lastError);
      if (shouldInjectContentScript(error)) {
        debugLog("injecting content script for transcript");
        await injectContentScript(tabId);
      }
    }
  }
  throw new Error(lastError);
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
          try {
            debugLog("dom transcript debug", JSON.stringify(response.debug));
          } catch {
            debugLog("dom transcript debug", response.debug);
          }
        }
        reject(new Error(response?.error || "transcript_unavailable"));
        return;
      }
      resolve(response.data || {});
    });
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
  const message = String(error?.message || error);
  return (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection")
  );
}

async function requestCaptions(tabId, preferredLanguage, expectedVideoId) {
  if (!tabId) {
    throw new Error("no active tab found");
  }
  const attempts = 6;
  let lastError = "";
  for (let i = 0; i < attempts; i += 1) {
    const result = await readCaptionsFromMainWorld(
      tabId,
      preferredLanguage,
      expectedVideoId
    );
    if (result?.ok && result.data?.track?.baseUrl) {
      return result.data;
    }
    const errorCode = result?.error || "unknown";
    if (errorCode === "player_response_mismatch") {
      throw new Error("caption_payload_mismatch");
    }
    lastError = errorCode;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`failed to read captions (${lastError || "unknown"})`);
}

function readCaptionsFromMainWorld(tabId, preferredLanguage, expectedVideoId) {
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

          const formatTrackName = (track) => {
            if (track?.name?.simpleText) return track.name.simpleText;
            if (Array.isArray(track?.name?.runs)) {
              return track.name.runs.map((run) => run.text).join("");
            }
            return track?.languageCode || "unknown";
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
          const tracks =
            response?.captions?.playerCaptionsTracklistRenderer?.captionTracks ??
            [];
          if (!tracks || tracks.length === 0) {
            return { ok: false, error: "no_caption_tracks" };
          }
          const selected = pickBestTrack(tracks);
          if (!selected?.baseUrl) {
            return { ok: false, error: "caption_track_missing_url" };
          }
          return {
            ok: true,
            data: {
              video: {
                videoId: actualId || expectedId || "",
                title: response?.videoDetails?.title ?? document.title ?? "",
                url: window.location.href,
              },
              track: buildTrackInfo(selected),
              tracks: tracks.map(buildTrackInfo),
              trackCount: tracks.length,
            },
          };
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(results?.[0]?.result || null);
      }
    );
  });
}

async function fetchText(url, signal) {
  debugLog("fetch captions", url);
  let response;
  try {
    response = await fetch(url, { credentials: "include", signal });
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw createAbortError();
    }
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

async function fetchCaptionText(baseUrl, signal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
  const basePayload = await fetchText(baseUrl, signal);
  const baseParsed = parseCaptionPayload(basePayload);
  if (baseParsed) return baseParsed;

  const hasFmt = baseUrl.includes("fmt=");
  if (hasFmt) {
    return "";
  }

  const formats = ["vtt", "srv3", "json3", "ttml"];
  for (const fmt of formats) {
    const url = ensureCaptionUrl(baseUrl, fmt);
    const payload = await fetchText(url, signal);
    const parsed = parseCaptionPayload(payload);
    if (parsed) return parsed;
  }
  return "";
}

async function fetchCaptionTextWithFallback(baseUrl, tabId, signal, task) {
  throwIfAborted(task);
  const direct = await fetchCaptionText(baseUrl, signal);
  throwIfAborted(task);
  if (direct) return direct;
  if (!tabId) return "";
  throwIfAborted(task);
  return await fetchCaptionTextViaPage(baseUrl, tabId);
}

async function fetchCaptionTextByVideo(
  videoId,
  language,
  isAutoGenerated,
  tabId,
  signal,
  task
) {
  if (!videoId) return "";
  if (signal?.aborted) throw createAbortError();
  const lang = language || "en";
  const params = new URLSearchParams({ v: videoId, lang });
  if (isAutoGenerated) {
    params.set("kind", "asr");
  }
  const baseUrl = `https://www.youtube.com/api/timedtext?${params.toString()}`;
  debugLog("fallback direct timedtext", baseUrl);
  return await fetchCaptionTextWithFallback(baseUrl, tabId, signal, task);
}

function buildTrackCandidates(tracks) {
  const output = [];
  const seen = new Set();
  for (const track of tracks || []) {
    const lang = String(track?.languageCode || "").trim();
    if (!lang) continue;
    const asrKey = `${lang}|${track?.isAutoGenerated ? "asr" : "manual"}`;
    if (!seen.has(asrKey)) {
      seen.add(asrKey);
      output.push({
        languageCode: lang,
        isAutoGenerated: Boolean(track?.isAutoGenerated),
      });
    }
    const genericKey = `${lang}|generic`;
    if (!seen.has(genericKey)) {
      seen.add(genericKey);
      output.push({
        languageCode: lang,
        isAutoGenerated: false,
      });
    }
  }
  return output;
}

async function fetchTimedTextTrackList(videoId, tabId, signal, task) {
  if (!videoId) return [];
  if (signal?.aborted) throw createAbortError();
  const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(
    videoId
  )}`;
  debugLog("fetch timedtext list", listUrl);
  let payload = await fetchText(listUrl, signal);
  if (payload) {
    debugLog("timedtext list payload (worker)", {
      length: payload.length,
      preview: payload.slice(0, 120),
    });
  }
  let tracks = payload ? parseTimedTextTrackList(payload) : [];
  if (tracks.length > 0) {
    debugLog("timedtext list tracks (worker)", tracks.length);
    const manual = tracks.filter((track) => !track.isAutoGenerated);
    const auto = tracks.filter((track) => track.isAutoGenerated);
    return [...manual, ...auto];
  }

  if (tabId) {
    try {
      const pagePayload = await fetchTextViaPage(tabId, listUrl);
      debugLog("timedtext list payload (page)", {
        length: pagePayload.length,
        preview: pagePayload.slice(0, 120),
      });
      tracks = parseTimedTextTrackList(pagePayload);
      debugLog("timedtext list tracks (page)", tracks.length);
    } catch (error) {
      debugLog("timedtext list fetch failed", error?.message || error);
    }
  }
  if (tracks.length === 0) return [];
  const manual = tracks.filter((track) => !track.isAutoGenerated);
  const auto = tracks.filter((track) => track.isAutoGenerated);
  return [...manual, ...auto];
}

function parseTimedTextTrackList(xmlText) {
  if (!xmlText || !xmlText.trim().startsWith("<")) return [];
  const tracks = [];
  const regex = /<track\b([^>]*)\/?>/gi;
  let match;
  while ((match = regex.exec(xmlText))) {
    const attrs = match[1] || "";
    const langCode =
      extractXmlAttribute(attrs, "lang_code") ||
      extractXmlAttribute(attrs, "lang") ||
      "";
    if (!langCode) continue;
    const kind = extractXmlAttribute(attrs, "kind") || "";
    const name = extractXmlAttribute(attrs, "name") || "";
    tracks.push({
      languageCode: langCode,
      name,
      kind,
      isAutoGenerated: kind === "asr",
    });
  }
  return tracks;
}

function extractXmlAttribute(attrs, key) {
  const regex = new RegExp(`${key}\\s*=\\s*(['\"])(.*?)\\1`, "i");
  const match = regex.exec(attrs);
  return match ? match[2] : "";
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

function sanitizeFilename(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function buildCaptionFilename({ title, videoId }) {
  const safeTitle = sanitizeFilename(normalizeVideoTitle(title));
  const safeVideoId = sanitizeFilename(videoId || "captions");
  const main = safeTitle || safeVideoId || "captions";
  return `VoiceInsight-${main}.txt`;
}

function normalizeVideoTitle(value) {
  return String(value || "")
    .replace(/\s*-\s*youtube\s*$/i, "")
    .trim();
}

function buildCaptionText({ text, title, url, language, auto }) {
  const lines = [];
  if (title) lines.push(`Title: ${title}`);
  if (url) lines.push(`URL: ${url}`);
  if (language) lines.push(`Language: ${language}`);
  if (typeof auto === "boolean") {
    lines.push(`Auto: ${auto ? "yes" : "no"}`);
  }
  if (lines.length > 0) {
    lines.push("");
  }
  lines.push(text || "");
  return lines.join("\n");
}

function toDataUrl(text, mimeType = "text/plain") {
  const encoded = btoa(unescape(encodeURIComponent(text)));
  return `data:${mimeType};base64,${encoded}`;
}

async function saveCaptionsToDownloads(payload) {
  const filename = buildCaptionFilename(payload);
  const content = buildCaptionText(payload);
  const dataUrl = toDataUrl(content, "text/plain;charset=utf-8");
  const downloadId = await downloadWithChrome(dataUrl, filename, false);
  await waitForDownloadComplete(downloadId);
  return downloadId;
}

async function showDownloadItem(downloadId) {
  try {
    chrome.downloads.show(downloadId);
  } catch {
    // ignore show errors
  }
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

function extractXmlLines(xmlText, tag) {
  const lines = [];
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  let match;
  while ((match = regex.exec(xmlText))) {
    const raw = match[1] ?? "";
    const cleaned = raw.replace(/<[^>]+>/g, "");
    const decoded = decodeEntities(cleaned);
    if (decoded) {
      lines.push(decoded);
    }
  }
  return lines;
}

function parseSrv3ToText(xmlText) {
  if (!xmlText || !xmlText.trim().startsWith("<")) return "";
  try {
    const lines = extractXmlLines(xmlText, "text");
    return normalizeTranscriptLines(lines);
  } catch {
    return "";
  }
}

function parseTtmlToText(xmlText) {
  if (!xmlText || !xmlText.trim().startsWith("<")) return "";
  try {
    const lines = extractXmlLines(xmlText, "p");
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
