import { Router } from 'express';

import {
  TranscriptBridgeError,
  fetchTranscriptViaYoutubeTranscriptApi
} from '../services/youtube/transcript-bridge.js';
import {
  YtDlpTranscriptError,
  fetchTranscriptViaYtDlp
} from '../services/youtube/transcript-yt-dlp.js';

const router = Router();

type TranscriptEngine = 'youtube-transcript-api' | 'yt-dlp';
type EngineAttempt = {
  engine: TranscriptEngine;
  ok: boolean;
  code: string;
  message: string;
  status: number;
  elapsedMs: number;
};

const ENGINE_TIMEOUT_RANGE = {
  min: 2000,
  max: 60000
} as const;

const DEFAULT_ENGINE_TIMEOUT_MS: Record<TranscriptEngine, number> = {
  'youtube-transcript-api': 7000,
  'yt-dlp': 9000
};
const MAX_COOKIE_HEADER_BYTES = 7000;

function parseEngineOrder(raw: string): TranscriptEngine[] {
  const defaultOrder: TranscriptEngine[] = ['youtube-transcript-api', 'yt-dlp'];
  const text = String(raw || '').trim();
  if (!text) return defaultOrder;

  const requested = text
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const out: TranscriptEngine[] = [];
  const seen = new Set<TranscriptEngine>();
  for (const item of requested) {
    let engine: TranscriptEngine | null = null;
    if (item === 'youtube-transcript-api' || item === 'python') {
      engine = 'youtube-transcript-api';
    } else if (item === 'yt-dlp' || item === 'ytdlp') {
      engine = 'yt-dlp';
    }
    if (!engine || seen.has(engine)) continue;
    seen.add(engine);
    out.push(engine);
  }
  return out.length > 0 ? out : defaultOrder;
}

function parseTimeoutValue(raw: unknown): number | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value)) return null;
  const clamped = Math.max(ENGINE_TIMEOUT_RANGE.min, Math.min(ENGINE_TIMEOUT_RANGE.max, value));
  return clamped;
}

function sanitizeIncomingCookieHeader(raw: unknown): string {
  const text = String(raw ?? '')
    .replace(/[\r\n]/g, '')
    .trim();
  if (!text) return '';
  return text.slice(0, MAX_COOKIE_HEADER_BYTES);
}

function sanitizeCookieSource(raw: unknown): string {
  return String(raw ?? '')
    .replace(/[\r\n]/g, ' ')
    .trim()
    .slice(0, 80);
}

function resolveEngineTimeouts(query: Record<string, unknown>): Record<TranscriptEngine, number> {
  const shared = parseTimeoutValue(query.engineTimeoutMs);
  const youtubeTimeout =
    parseTimeoutValue(query.engineTimeoutYoutubeMs) ??
    shared ??
    DEFAULT_ENGINE_TIMEOUT_MS['youtube-transcript-api'];
  const ytDlpTimeout =
    parseTimeoutValue(query.engineTimeoutYtDlpMs) ??
    shared ??
    DEFAULT_ENGINE_TIMEOUT_MS['yt-dlp'];

  return {
    'youtube-transcript-api': youtubeTimeout,
    'yt-dlp': ytDlpTimeout
  };
}

function normalizeTranscriptError(error: unknown): {
  code: string;
  message: string;
  status: number;
} {
  if (error instanceof TranscriptBridgeError) {
    return {
      code: error.code,
      message: error.message || error.code,
      status: error.status
    };
  }
  if (error instanceof YtDlpTranscriptError) {
    return {
      code: error.code,
      message: error.message || error.code,
      status: error.status
    };
  }
  const message = String((error as Error)?.message || error || 'transcript_fetch_failed');
  return {
    code: 'transcript_fetch_failed',
    message,
    status: 500
  };
}

function selectFinalError(
  errors: Array<{ code: string; message: string; status: number }>
): { code: string; message: string; status: number } {
  if (!errors.length) {
    return {
      code: 'captions_not_found',
      message: 'captions_not_found',
      status: 404
    };
  }
  const priorities = [
    /request_blocked|ip_blocked|youtube_request_failed|login_required|proxy_failed/i,
    /bridge_timeout/i,
    /video_unavailable|age_restricted|no_transcript_found|transcripts_disabled|captions_not_found|no_caption_tracks/i,
    /yt_dlp_not_installed|python_dependency_missing/i
  ];
  for (const matcher of priorities) {
    const found = errors.find((item) => matcher.test(item.code));
    if (found) return found;
  }
  return errors[errors.length - 1];
}

router.get('/youtube/transcript', async (req, res, next) => {
  try {
    const videoId = String(req.query.videoId || '').trim();
    const languages = String(req.query.languages || req.query.lang || '').trim();
    const engines = parseEngineOrder(String(req.query.engines || '').trim());
    const engineTimeouts = resolveEngineTimeouts(req.query as Record<string, unknown>);
    const youtubeCookieHeader = sanitizeIncomingCookieHeader(
      req.header('x-vi-youtube-cookie')
    );
    const youtubeCookieSource = sanitizeCookieSource(
      req.header('x-vi-cookie-source') || req.query.cookieSource
    );

    if (!videoId) {
      return res.status(400).json({
        ok: false,
        error: 'missing_video_id',
        message: 'videoId is required'
      });
    }

    const failures: Array<{ code: string; message: string; status: number }> = [];
    const engineAttempts: EngineAttempt[] = [];
    for (const engine of engines) {
      const startedAt = Date.now();
      try {
        const payload =
          engine === 'youtube-transcript-api'
            ? await fetchTranscriptViaYoutubeTranscriptApi({
                videoId,
                languages,
                timeoutMs: engineTimeouts['youtube-transcript-api']
              })
            : await fetchTranscriptViaYtDlp({
                videoId,
                languages,
                timeoutMs: engineTimeouts['yt-dlp'],
                cookieHeader: youtubeCookieHeader,
                cookieSource: youtubeCookieSource
              });
        engineAttempts.push({
          engine,
          ok: true,
          code: 'ok',
          message: 'ok',
          status: 200,
          elapsedMs: Math.max(0, Date.now() - startedAt)
        });
        return res.json({
          ...payload,
          engine,
          engineAttempts
        });
      } catch (error) {
        const normalized = normalizeTranscriptError(error);
        failures.push(normalized);
        engineAttempts.push({
          engine,
          ok: false,
          code: normalized.code,
          message: normalized.message,
          status: normalized.status,
          elapsedMs: Math.max(0, Date.now() - startedAt)
        });
      }
    }

    const finalError = selectFinalError(failures);
    return res.status(finalError.status).json({
      ok: false,
      error: finalError.code,
      message: finalError.message,
      enginesTried: engines,
      engineAttempts
    });
  } catch (error) {
    next(error);
  }
});

export default router;
