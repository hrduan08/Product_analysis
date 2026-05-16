#!/usr/bin/env bash
set -euo pipefail

LAUNCH_AGENT_ID="com.voiceinsight.transcript-agent"
LAUNCHER_AGENT_ID="com.voiceinsight.transcript-agent-launcher"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LAUNCH_AGENT_ID}.plist"
LAUNCHER_PLIST_PATH="${HOME}/Library/LaunchAgents/${LAUNCHER_AGENT_ID}.plist"
LOG_DIR="${HOME}/Library/Logs/VoiceInsight"
AGENT_HOST="${VOICEINSIGHT_AGENT_HOST:-127.0.0.1}"
AGENT_PORT="${VOICEINSIGHT_AGENT_PORT:-8080}"
LAUNCHER_HOST="${VOICEINSIGHT_LAUNCHER_HOST:-127.0.0.1}"
LAUNCHER_PORT="${VOICEINSIGHT_LAUNCHER_PORT:-17846}"

echo "[voiceinsight-agent] preparing install..."

if ! command -v node >/dev/null 2>&1; then
  echo "[voiceinsight-agent] error: node is required"
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[voiceinsight-agent] error: pnpm is required"
  exit 1
fi

mkdir -p "${HOME}/Library/LaunchAgents"
mkdir -p "${LOG_DIR}"

cd "${REPO_ROOT}"
echo "[voiceinsight-agent] building local agent..."
pnpm --filter @app/server run build:agent

NODE_BIN="$(command -v node)"
AGENT_JS="${REPO_ROOT}/packages/server/dist-agent/agent.js"
LAUNCHER_JS="${REPO_ROOT}/packages/agent/dist/launcher.cjs"
if [[ ! -f "${AGENT_JS}" ]]; then
  echo "[voiceinsight-agent] error: built agent file missing: ${AGENT_JS}"
  exit 1
fi

cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_AGENT_ID}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${AGENT_JS}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>AGENT_HOST</key>
    <string>${AGENT_HOST}</string>
    <key>AGENT_PORT</key>
    <string>${AGENT_PORT}</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${REPO_ROOT}</string>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/agent.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/agent.err.log</string>
</dict>
</plist>
EOF

if [[ -f "${LAUNCHER_JS}" ]]; then
  cat > "${LAUNCHER_PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHER_AGENT_ID}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${LAUNCHER_JS}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>AGENT_LAUNCHER_HOST</key>
    <string>${LAUNCHER_HOST}</string>
    <key>AGENT_LAUNCHER_PORT</key>
    <string>${LAUNCHER_PORT}</string>
    <key>AGENT_LAUNCHER_AGENT_LABEL</key>
    <string>${LAUNCH_AGENT_ID}</string>
    <key>AGENT_LAUNCHER_AGENT_PLIST</key>
    <string>${PLIST_PATH}</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${REPO_ROOT}</string>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/launcher.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/launcher.err.log</string>
</dict>
</plist>
EOF
else
  echo "[voiceinsight-agent] warning: launcher file missing (${LAUNCHER_JS}), auto-wake unavailable."
fi

echo "[voiceinsight-agent] reloading launchd job..."
launchctl bootout "gui/$(id -u)" "${PLIST_PATH}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "${PLIST_PATH}"
launchctl enable "gui/$(id -u)/${LAUNCH_AGENT_ID}" >/dev/null 2>&1 || true
launchctl kickstart -k "gui/$(id -u)/${LAUNCH_AGENT_ID}"

if [[ -f "${LAUNCHER_PLIST_PATH}" ]]; then
  launchctl bootout "gui/$(id -u)" "${LAUNCHER_PLIST_PATH}" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$(id -u)" "${LAUNCHER_PLIST_PATH}"
  launchctl enable "gui/$(id -u)/${LAUNCHER_AGENT_ID}" >/dev/null 2>&1 || true
  launchctl kickstart -k "gui/$(id -u)/${LAUNCHER_AGENT_ID}"
fi

sleep 1
if command -v curl >/dev/null 2>&1; then
  if curl --max-time 2 -fsS "http://${AGENT_HOST}:${AGENT_PORT}/health" >/dev/null; then
    echo "[voiceinsight-agent] installed and healthy at http://${AGENT_HOST}:${AGENT_PORT}/health"
    exit 0
  fi
fi

echo "[voiceinsight-agent] installed, but health check did not return success yet."
echo "[voiceinsight-agent] check logs: ${LOG_DIR}/agent.err.log"
