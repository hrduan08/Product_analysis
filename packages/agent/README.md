# VoiceInsight Local Agent (macOS first)

This local agent is used by the extension as the local `VOICEINSIGHT_API` service.

Current scope:
- macOS installer and auto-start (`launchd`)
- local HTTP service on `127.0.0.1:8080`
- transcript dual-engine routing on the backend (`youtube-transcript-api` then `yt-dlp`)
- local launcher wake service on `127.0.0.1:17846` (used by extension to auto-kick Agent)

## Quick install (macOS)

From repo root:

```bash
bash packages/agent/macos/install.sh
```

## Uninstall (macOS)

```bash
bash packages/agent/macos/uninstall.sh
```

## Health check

```bash
curl http://127.0.0.1:8080/health
```

Expected:

```json
{"status":"ok","service":"voiceinsight-local-agent","timestamp":"..."}
```

## Launcher wake check

```bash
curl http://127.0.0.1:17846/health
curl http://127.0.0.1:17846/wake
```

## Notes

- First-time install requires user confirmation because local executable install + auto-start cannot be silent by browser security model.
- This script is user-level (`~/Library/LaunchAgents`) and does not require system-wide daemon privileges.
- Runtime prerequisites:
  - `node`
  - `pnpm`
  - server dependencies installed in this repo (`pnpm install`)
