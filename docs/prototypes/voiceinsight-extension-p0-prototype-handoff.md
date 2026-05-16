# VoiceInsight Extension P0 Prototype Handoff (Strict Scope)

## 1. Prototype Files
- Local interactive prototype:
  - `docs/prototypes/voiceinsight-extension-p0-sidepanel.html`
- Figma strict P0 state-matrix file (ZH+EN):
  - `https://www.figma.com/design/6JMVCHfvD7zdkwxZUesxnX`

## 2. P0 Scope (Frozen)
1. Auto-extract transcript timeline (loading/success/error states)
2. Download subtitles with format options (`TXT / SRT / VTT`)
3. Copy transcript
4. UI language switch (`中文 / English`)
5. Footer website CTA only (`VoiceInsight 官网 / VoiceInsight Website`)

## 3. Explicitly Removed (Out of P0)
- Video title / source / track info block in panel
- Settings button and settings drawer
- Keyword filtering UI
- Mid-toolbar "Open VoiceInsight" button
- Any other P1 controls

## 4. Figma Scene Map
- `1:2` Success (ZH)
- `2:2` Loading (ZH)
- `3:2` Error (ZH)
- `4:2` Success (EN)
- `5:2` Loading (EN)
- `6:2` Error (EN)

每个场景顶部都包含状态标识条：
- `页面：插件侧边栏 / Page: Extension Side Panel`
- `状态：... / Status: ...`
- `语言：... / Language: ...`

## 5. Suggested Figma Prototype Wiring
- Set `1:2` as Flow starting point.
- Add hotspot/button links to switch states:
  - `1:2 -> 2:2` (Loading)
  - `1:2 -> 3:2` (Error)
  - `2:2 -> 1:2` (Success)
  - `3:2 -> 1:2` (Success)
- Optional language switch:
  - `1:2 <-> 4:2`

## 6. Review Checklist
- Subtitle text is exactly `YouTube 字幕助手` in zh.
- No video metadata block appears in the panel.
- No settings button appears in the toolbar.
- No keyword filter appears in the panel.
- Only footer CTA remains:
  - text: `更多功能请访问 VoiceInsight 官网`
  - button: `VoiceInsight 官网`
