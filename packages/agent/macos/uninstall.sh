#!/usr/bin/env bash
set -euo pipefail

LAUNCH_AGENT_ID="com.voiceinsight.transcript-agent"
LAUNCHER_AGENT_ID="com.voiceinsight.transcript-agent-launcher"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LAUNCH_AGENT_ID}.plist"
LAUNCHER_PLIST_PATH="${HOME}/Library/LaunchAgents/${LAUNCHER_AGENT_ID}.plist"

echo "[voiceinsight-agent] uninstalling..."
launchctl bootout "gui/$(id -u)" "${PLIST_PATH}" >/dev/null 2>&1 || true
launchctl disable "gui/$(id -u)/${LAUNCH_AGENT_ID}" >/dev/null 2>&1 || true
launchctl bootout "gui/$(id -u)" "${LAUNCHER_PLIST_PATH}" >/dev/null 2>&1 || true
launchctl disable "gui/$(id -u)/${LAUNCHER_AGENT_ID}" >/dev/null 2>&1 || true

if [[ -f "${PLIST_PATH}" ]]; then
  rm -f "${PLIST_PATH}"
fi
if [[ -f "${LAUNCHER_PLIST_PATH}" ]]; then
  rm -f "${LAUNCHER_PLIST_PATH}"
fi

echo "[voiceinsight-agent] removed launch agent: ${LAUNCH_AGENT_ID}"
echo "[voiceinsight-agent] removed launch agent: ${LAUNCHER_AGENT_ID}"
