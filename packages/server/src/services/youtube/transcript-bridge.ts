import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type TranscriptTimelineLine = {
  timestamp: string;
  seconds: number;
  start: number;
  startMs: number;
  text: string;
};

export type TranscriptBridgeSuccess = {
  ok: true;
  source: 'youtube-transcript-api';
  videoId: string;
  languageCode: string;
  lineCount: number;
  timeline: TranscriptTimelineLine[];
  transcript: string;
};

type TranscriptBridgeFailure = {
  ok: false;
  error: string;
  message?: string;
  errorType?: string;
};

type TranscriptBridgePayload = TranscriptBridgeSuccess | TranscriptBridgeFailure;

export class TranscriptBridgeError extends Error {
  code: string;
  status: number;

  constructor(code: string, message?: string, status = 500) {
    super(message || code);
    this.name = 'TranscriptBridgeError';
    this.code = code;
    this.status = status;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const bridgeScriptCandidates = [
  resolve(process.cwd(), 'packages/server/scripts/youtube_transcript_bridge.py'),
  resolve(process.cwd(), 'scripts/youtube_transcript_bridge.py'),
  resolve(__dirname, '../../../scripts/youtube_transcript_bridge.py'),
  resolve(__dirname, '../../../../scripts/youtube_transcript_bridge.py')
];

let scriptPathPromise: Promise<string> | null = null;

async function resolveBridgeScriptPath(): Promise<string> {
  if (scriptPathPromise) {
    return scriptPathPromise;
  }
  scriptPathPromise = (async () => {
    for (const candidate of bridgeScriptCandidates) {
      try {
        await access(candidate);
        return candidate;
      } catch {
        // continue
      }
    }
    throw new TranscriptBridgeError(
      'bridge_script_not_found',
      'youtube_transcript_bridge.py not found',
      500
    );
  })();
  return scriptPathPromise;
}

function parseLanguages(input: string[] | string | undefined): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join(',') : input;
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function mapBridgeErrorStatus(code: string): number {
  if (code === 'missing_video_id') return 400;
  if (
    code === 'captions_not_found' ||
    code === 'no_transcript_found' ||
    code === 'transcripts_disabled' ||
    code === 'video_unavailable' ||
    code === 'age_restricted'
  ) {
    return 404;
  }
  if (code === 'request_blocked' || code === 'ip_blocked' || code === 'youtube_request_failed') {
    return 502;
  }
  if (code === 'bridge_timeout') {
    return 504;
  }
  return 500;
}

function buildBridgeEnv(): NodeJS.ProcessEnv {
  const keepProxy = process.env.YT_TRANSCRIPT_BRIDGE_KEEP_PROXY === '1';
  if (keepProxy) {
    return { ...process.env };
  }

  const env = { ...process.env };
  delete env.HTTP_PROXY;
  delete env.HTTPS_PROXY;
  delete env.NO_PROXY;
  delete env.http_proxy;
  delete env.https_proxy;
  delete env.no_proxy;
  return env;
}

function coerceBridgePayload(raw: string): TranscriptBridgePayload | null {
  const text = String(raw || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text) as TranscriptBridgePayload;
  } catch {
    return null;
  }
}

function normalizeSuccessPayload(
  payload: TranscriptBridgeSuccess,
  expectedVideoId: string
): TranscriptBridgeSuccess {
  const timeline = Array.isArray(payload.timeline)
      ? payload.timeline
          .map((item) => ({
            timestamp: String(item?.timestamp || '').trim(),
            seconds: Number(item?.seconds ?? 0),
            start: Number(
              Number.isFinite(Number(item?.start))
                ? Number(item?.start)
                : Number(item?.seconds ?? 0)
            ),
            startMs: Number(
              Number.isFinite(Number(item?.startMs))
                ? Number(item?.startMs)
                : Number(item?.seconds ?? 0) * 1000
            ),
            text: String(item?.text || '').trim()
          }))
        .filter(
          (item) =>
            item.timestamp &&
            item.text &&
            Number.isFinite(item.seconds) &&
            Number.isFinite(item.start) &&
            Number.isFinite(item.startMs)
        )
    : [];

  if (timeline.length === 0) {
    throw new TranscriptBridgeError('captions_not_found', 'no timeline in bridge payload', 404);
  }

  return {
    ok: true,
    source: 'youtube-transcript-api',
    videoId: String(payload.videoId || expectedVideoId || '').trim(),
    languageCode: String(payload.languageCode || '').trim(),
    lineCount: timeline.length,
    timeline,
    transcript:
      String(payload.transcript || '').trim() ||
      timeline.map((item) => item.text).join(' ').trim()
  };
}

export async function fetchTranscriptViaYoutubeTranscriptApi(params: {
  videoId: string;
  languages?: string[] | string;
  timeoutMs?: number;
}): Promise<TranscriptBridgeSuccess> {
  const videoId = String(params.videoId || '').trim();
  if (!videoId) {
    throw new TranscriptBridgeError('missing_video_id', 'videoId is required', 400);
  }

  const scriptPath = await resolveBridgeScriptPath();
  const pythonBin = process.env.YT_TRANSCRIPT_PYTHON_BIN || 'python3';
  const envTimeoutMs = Number.parseInt(
    String(process.env.YT_TRANSCRIPT_BRIDGE_TIMEOUT_MS || ''),
    10
  );
  const timeoutMs =
    Number.isFinite(params.timeoutMs) && Number(params.timeoutMs) > 0
      ? Number(params.timeoutMs)
      : Number.isFinite(envTimeoutMs) && envTimeoutMs > 0
      ? envTimeoutMs
      : 25_000;
  const languages = parseLanguages(params.languages);

  const args = [scriptPath, '--video-id', videoId];
  if (languages.length > 0) {
    args.push('--languages', languages.join(','));
  }

  const result = await new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
  }>((resolve, reject) => {
    const child = spawn(pythonBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: buildBridgeEnv()
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });

  if (result.timedOut) {
    throw new TranscriptBridgeError('bridge_timeout', 'bridge request timed out', 504);
  }

  const payload = coerceBridgePayload(result.stdout);
  if (result.code === 0 && payload && payload.ok) {
    return normalizeSuccessPayload(payload, videoId);
  }

  const bridgeError = payload && !payload.ok ? String(payload.error || 'bridge_failed') : 'bridge_failed';
  const message =
    (payload && !payload.ok ? payload.message : undefined) ||
    (result.stderr || '').trim() ||
    bridgeError;
  throw new TranscriptBridgeError(bridgeError, message, mapBridgeErrorStatus(bridgeError));
}
