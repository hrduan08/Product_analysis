# CHANGELOG (字幕下载 / Extension)

本文件用于记录与字幕下载相关的关键行为变更，确保每个版本都有明确的版本号、说明、可回退的标记。

## 版本规则
- 版本号格式：`vYYYY.MM.DD-N`
- 每个版本都对应一个 git tag，可用于精准回退。
- 回退命令示例：
  ```bash
  git checkout <tag> -- packages/extension/contentScript.js
  ```

## v2026.02.07-2
- 日期：2026-02-07
- 范围：`packages/extension/contentScript.js`
- 变更：新增 YouTube SPA 导航监听与字幕轨道等待逻辑，切换视频后无需刷新即可获取字幕。
- Tag：`ext/v2026.02.07-2`

## v2026.02.07-1
- 日期：2026-02-07
- 范围：`packages/extension/contentScript.js`
- 变更：SPA 导航修复前的基线版本（切换视频后需刷新）。
- Tag：`ext/v2026.02.07-1`
- 兼容标记：`backup/contentScript-spa-before-fix`
