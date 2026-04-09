# VoiceInsight Extension Architecture

## Goals
- Keep transcript extraction logic in **one place**.
- Keep content script lightweight and stable for YouTube SPA navigation updates.
- Keep background worker focused on side-panel lifecycle only.

## Runtime Responsibility Split

### `popup.js` (single source of transcript truth)
- Owns transcript extraction orchestration.
- Owns fallback chain:
  1. `VOICEINSIGHT_API` (`/api/youtube/transcript`, engine order `youtube-transcript-api -> yt-dlp`)
  2. `CAPTION_TRACK`
  3. `TIMEDTEXT_LIST`
  4. `PAGE_CAPTURE`
- Owns diagnostics/business logs and error mapping.
- Owns transcript export/copy/download interactions.

### `popup.shared.js` (pure helper layer)
- Owns reusable pure functions for:
  - text normalization/sanitization,
  - timestamp conversion/formatting,
  - export formatting (`txt/srt/vtt`),
  - timedtext payload parsing (`vtt/json/xml`).
- Must stay side-effect free.
- Loaded before `popup.js` in `popup.html`.

### `contentScript.js` (navigation bridge only)
- Listens YouTube SPA navigation events.
- Sends `VI_ACTIVE_VIDEO_CHANGED` to notify popup for auto-refresh.
- Does not handle transcript extraction or transcript RPC messages.

### `background.js` (side panel bootstrap only)
- Configures `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.
- Does not handle transcript extraction or download pipeline logic.

## Why this refactor
Previous versions had transcript logic spread across popup/content/background, causing:
- duplicated parsing/fallback behavior,
- harder debugging and inconsistent fixes,
- higher regression risk.

Now transcript extraction is centralized in `popup.js`, making behavior predictable and easier to evolve.

## Dev Notes
- Preferred debug entry: popup diagnostics panel.
- When adding a new extraction strategy, add it in `popup.js` fallback chain only.
- When adding or changing shared parsing/formatting primitives, update `popup.shared.js` first.
- Avoid reintroducing transcript parsing logic into content/background.
