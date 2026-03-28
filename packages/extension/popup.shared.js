// Shared pure helpers for popup transcript pipeline.
// Keep this file side-effect free to simplify maintenance and testing.

function normalizeLineText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sanitizeTranscriptLineText(value) {
  let text = normalizeLineText(value);
  if (!text) return "";
  text = text
    .replace(/\bsync to video time\b/gi, " ")
    .replace(
      /^\s*\d{1,3}\s*minutes?\s*,?\s*\d{1,2}\s*seconds?(?=[a-z\u4e00-\u9fff])/i,
      ""
    )
    // Remove transcript-row aria noise like "7 secondssmartwatch..." / "7 seconds smartwatch..."
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
    .replace(/^\s*\d{1,4}\s*(?:seconds?|sec|秒(?:钟|鐘)?)(?:\s*[-–—•:：,，]\s*|\s+)/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (/^sync to video time$/i.test(text)) return "";
  return text;
}

function joinSegmentText(baseText, nextText) {
  const left = normalizeLineText(baseText);
  const right = normalizeLineText(nextText);
  if (!left) return right;
  if (!right) return left;
  if (/^[,.;:!?%)\]}>，。！？；：、]/.test(right)) {
    return `${left}${right}`;
  }
  return `${left} ${right}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function pad3(value) {
  return String(value).padStart(3, "0");
}

function parseTimestampToSeconds(value) {
  const raw = String(value || "").trim();
  if (!raw || !raw.includes(":")) return Number.NaN;

  const parts = raw.split(":").map((part) => part.trim());
  if (parts.length < 2 || parts.length > 3) return Number.NaN;
  if (parts.some((part) => part === "")) return Number.NaN;

  const numbers = parts.map((part) => Number.parseFloat(part));
  if (numbers.some((num) => !Number.isFinite(num))) return Number.NaN;

  if (numbers.length === 2) {
    return numbers[0] * 60 + numbers[1];
  }

  return numbers[0] * 3600 + numbers[1] * 60 + numbers[2];
}

function formatClock(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) {
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }
  return `${pad2(m)}:${pad2(s)}`;
}

function normalizeTimestamp(value) {
  const raw = String(value || "").replace(/：/g, ":").trim();
  const seconds = parseTimestampToSeconds(raw);
  if (!Number.isFinite(seconds)) return "";
  return formatClock(seconds);
}

function getLineSeconds(line, index) {
  if (Number.isFinite(line?.startMs)) {
    return Number(line.startMs) / 1000;
  }
  if (Number.isFinite(line?.start)) {
    return Number(line.start);
  }
  if (Number.isFinite(line.seconds)) return line.seconds;
  return index * 3;
}

function getCueEndSeconds(lines, index, startSeconds) {
  const next = lines[index + 1];
  const nextSeconds = Number.isFinite(next?.seconds)
    ? next.seconds
    : startSeconds + 3;
  if (nextSeconds <= startSeconds) {
    return startSeconds + 3;
  }
  return Math.max(startSeconds + 1, nextSeconds - 0.1);
}

function buildTimedCueLines(lines, options = {}) {
  const includeTimestamp = options?.includeTimestamp !== false;
  const baseLines = Array.isArray(lines) ? lines : [];
  if (baseLines.length === 0) return [];

  return baseLines.map((line, index) => {
    const text = normalizeLineText(line?.text);
    const naturalStart = getLineSeconds(line, index);
    const syntheticStart = index * 3;
    return {
      text,
      seconds: includeTimestamp ? naturalStart : syntheticStart,
    };
  });
}

function toSrtTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const whole = Math.floor(safe);
  const ms = Math.floor((safe - whole) * 1000);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

function toVttTime(seconds) {
  return toSrtTime(seconds).replace(",", ".");
}

function buildTxtText(lines, options = {}) {
  const includeTimestamp = options?.includeTimestamp !== false;
  return lines
    .map((line, index) => {
      const text = normalizeLineText(line?.text);
      if (!text) return "";
      if (!includeTimestamp) return text;
      const timestamp =
        normalizeTimestamp(line?.timestamp) || formatClock(getLineSeconds(line, index));
      return `[${timestamp}] ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

function buildSrtText(lines, options = {}) {
  const timedLines = buildTimedCueLines(lines, options);
  return timedLines
    .map((line, index) => {
      const startSeconds = Number(line.seconds) || 0;
      const endSeconds = getCueEndSeconds(timedLines, index, startSeconds);
      return `${index + 1}\n${toSrtTime(startSeconds)} --> ${toSrtTime(endSeconds)}\n${line.text}`;
    })
    .join("\n\n");
}

function buildVttText(lines, options = {}) {
  const timedLines = buildTimedCueLines(lines, options);
  const body = timedLines
    .map((line, index) => {
      const startSeconds = Number(line.seconds) || 0;
      const endSeconds = getCueEndSeconds(timedLines, index, startSeconds);
      return `${toVttTime(startSeconds)} --> ${toVttTime(endSeconds)}\n${line.text}`;
    })
    .join("\n\n");

  return `WEBVTT\n\n${body}`;
}

function normalizeExportFormat(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "srt" || value === "vtt" || value === "txt") {
    return value;
  }
  return "txt";
}

function buildExportText(format, lines, options = {}) {
  const safeFormat = normalizeExportFormat(format);
  const includeTimestamp = options?.includeTimestamp !== false;
  if (safeFormat === "srt") {
    return buildSrtText(lines, { includeTimestamp });
  }
  if (safeFormat === "vtt") {
    return buildVttText(lines, { includeTimestamp });
  }
  return buildTxtText(lines, { includeTimestamp });
}

function sanitizeFilename(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s]+/, "")
    .replace(/[.\s]+$/, "")
    .slice(0, 80);
}

function normalizeVideoTitle(value) {
  return String(value || "")
    .replace(/\s*-\s*youtube\s*$/i, "")
    .trim();
}

function getMimeTypeByFormat(format) {
  if (format === "srt") return "application/x-subrip;charset=utf-8";
  if (format === "vtt") return "text/vtt;charset=utf-8";
  return "text/plain;charset=utf-8";
}

function readTimedtextFormat(url) {
  try {
    const parsed = new URL(String(url || "").trim());
    return String(parsed.searchParams.get("fmt") || "");
  } catch {
    return "";
  }
}

function detectTimedtextPayloadKind(payload) {
  const text = String(payload || "").trim();
  if (!text) return "empty";
  if (text.startsWith("WEBVTT")) return "webvtt";
  if (text.startsWith(")]}'")) return "xssi_json";
  if (text.startsWith("{")) return "json";
  if (text.startsWith("<")) {
    const head = text.slice(0, 360).toLowerCase();
    if (head.includes("<html") || head.includes("<!doctype html")) {
      return "html";
    }
    return "xml";
  }
  return "unknown";
}

function getTimedtextBodyPreview(payload, limit = 180) {
  const compact = String(payload || "").replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit)}...`;
}

function parseTimelinePayload(payload) {
  const text = String(payload || "").trim();
  if (!text) return [];
  if (text.startsWith("WEBVTT")) return parseVttTimeline(text);
  if (text.startsWith("{")) return parseJson3Timeline(text);
  if (text.startsWith("<")) return parseXmlTimeline(text);
  return parseVttTimeline(text);
}

function parseVttTimeline(vttText) {
  const rows = String(vttText || "").split(/\r?\n/);
  const timeline = [];
  let startSeconds = Number.NaN;
  let textLines = [];

  const flush = () => {
    if (!Number.isFinite(startSeconds)) {
      startSeconds = Number.NaN;
      textLines = [];
      return;
    }
    const text = normalizeLineText(
      decodeEntities(textLines.join(" ").replace(/<[^>]+>/g, " "))
    );
    if (!text) {
      startSeconds = Number.NaN;
      textLines = [];
      return;
    }

    const timestamp = formatClock(startSeconds);
    const normalizedSeconds = Math.round(Math.max(0, startSeconds) * 1000) / 1000;
    const startMs = Math.round(normalizedSeconds * 1000);
    const previous = timeline[timeline.length - 1];
    if (
      previous &&
      previous.startMs === startMs &&
      previous.text === text
    ) {
      startSeconds = Number.NaN;
      textLines = [];
      return;
    }

    timeline.push({
      timestamp,
      seconds: normalizedSeconds,
      start: normalizedSeconds,
      startMs,
      text,
    });
    startSeconds = Number.NaN;
    textLines = [];
  };

  rows.forEach((raw) => {
    const line = String(raw || "").trim();
    if (!line) {
      flush();
      return;
    }
    if (
      line.startsWith("WEBVTT") ||
      line.startsWith("NOTE") ||
      line.startsWith("STYLE") ||
      line.startsWith("REGION")
    ) {
      return;
    }
    if (line.includes("-->")) {
      flush();
      const start = line.split("-->")[0].trim().split(/\s+/)[0] || "";
      const parsed = parseTimestampToSeconds(start.replace(",", "."));
      startSeconds = Number.isFinite(parsed) ? parsed : Number.NaN;
      textLines = [];
      return;
    }
    if (/^\d+$/.test(line) && !Number.isFinite(startSeconds)) {
      return;
    }
    if (Number.isFinite(startSeconds)) {
      textLines.push(line);
    }
  });

  flush();
  return timeline;
}

function parseJson3Timeline(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    const events = Array.isArray(data?.events) ? data.events : [];
    const timeline = [];
    events.forEach((event) => {
      if (!Array.isArray(event?.segs)) return;
      const text = normalizeLineText(
        decodeEntities(
          event.segs.map((seg) => String(seg?.utf8 || "")).join("")
        )
      );
      if (!text) return;

      const startMs = Number(event?.tStartMs);
      if (!Number.isFinite(startMs)) return;
      const seconds = Math.round(Math.max(0, startMs / 1000) * 1000) / 1000;
      const normalizedStartMs = Math.round(seconds * 1000);
      const timestamp = formatClock(seconds);
      const previous = timeline[timeline.length - 1];
      if (
        previous &&
        previous.startMs === normalizedStartMs &&
        previous.text === text
      ) {
        return;
      }

      timeline.push({
        timestamp,
        seconds,
        start: seconds,
        startMs: normalizedStartMs,
        text,
      });
    });
    return timeline;
  } catch {
    return [];
  }
}

function parseXmlTimeline(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) {
      return [];
    }

    const nodes = [
      ...Array.from(doc.getElementsByTagName("text")),
      ...Array.from(doc.getElementsByTagName("p")),
    ];
    const timeline = [];

    nodes.forEach((node) => {
      const text = normalizeLineText(decodeEntities(node.textContent || ""));
      if (!text) return;

      let seconds = Number.NaN;
      const start = node.getAttribute("start");
      if (start) {
        seconds = parseXmlStartValue(start, false);
      }
      if (!Number.isFinite(seconds)) {
        const begin = node.getAttribute("begin");
        if (begin) {
          seconds = parseXmlStartValue(begin, false);
        }
      }
      if (!Number.isFinite(seconds)) {
        const tValue = node.getAttribute("t");
        if (tValue) {
          seconds = parseXmlStartValue(tValue, true);
        }
      }
      if (!Number.isFinite(seconds)) return;

      const timestamp = formatClock(seconds);
      const normalizedSeconds = Math.round(Math.max(0, seconds) * 1000) / 1000;
      const startMs = Math.round(normalizedSeconds * 1000);
      const previous = timeline[timeline.length - 1];
      if (
        previous &&
        previous.startMs === startMs &&
        previous.text === text
      ) {
        return;
      }

      timeline.push({
        timestamp,
        seconds: normalizedSeconds,
        start: normalizedSeconds,
        startMs,
        text,
      });
    });

    return timeline;
  } catch {
    return [];
  }
}

function parseXmlStartValue(raw, millisecondHint) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return Number.NaN;
  if (value.includes(":")) {
    return parseTimestampToSeconds(value.replace(",", "."));
  }
  if (value.endsWith("ms")) {
    const ms = Number.parseFloat(value.slice(0, -2));
    return Number.isFinite(ms) ? ms / 1000 : Number.NaN;
  }
  if (value.endsWith("s")) {
    const seconds = Number.parseFloat(value.slice(0, -1));
    return Number.isFinite(seconds) ? seconds : Number.NaN;
  }
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return Number.NaN;
  if (millisecondHint) return number / 1000;
  return number;
}

function ensureCaptionUrl(baseUrl, fmt) {
  const source = String(baseUrl || "").trim();
  const format = String(fmt || "").trim();
  if (!source || !format) return source;

  if (/([?&])fmt=[^&#]*/i.test(source)) {
    return source.replace(
      /([?&])fmt=[^&#]*/i,
      `$1fmt=${encodeURIComponent(format)}`
    );
  }

  const hashIndex = source.indexOf("#");
  const withoutHash = hashIndex >= 0 ? source.slice(0, hashIndex) : source;
  const hash = hashIndex >= 0 ? source.slice(hashIndex) : "";
  const joiner = withoutHash.endsWith("?") || withoutHash.endsWith("&")
    ? ""
    : withoutHash.includes("?")
      ? "&"
      : "?";

  return `${withoutHash}${joiner}fmt=${encodeURIComponent(format)}${hash}`;
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
