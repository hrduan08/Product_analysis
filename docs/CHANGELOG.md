# CHANGELOG (字幕下载 / Extension)

本文件用于记录与字幕下载相关的关键行为变更，确保每个版本都有明确的版本号、说明、可回退的标记。

## 版本规则
- 版本号格式：`vYYYY.MM.DD-N`
- 每个版本都对应一个 git tag，可用于精准回退。
- 回退命令示例：
  ```bash
  git checkout <tag> -- packages/extension/contentScript.js
  ```

> 备份记录按日期倒序展示（最新在前）。

## 备份 2026-03-28 (VoiceInsight Saas v1.0.0 基线)
- 版本号：`VoiceInsight Saas v1.0.0`
- 日期：2026-03-28
- 范围：SaaS 平台源码与基础配置（`packages/web`、`packages/server`、`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`tsconfig.base.json`、`docker-compose.db.yml`）
- 说明：VoiceInsight SaaS 平台首次完整备份（不含可重建产物 `node_modules/dist`）
- 本地目录快照：`backups/voiceinsight-saas-backup-v1.0.0-20260328-102030`
- 本地压缩包（zip）：`backups/archives/voiceinsight-saas-backup-v1.0.0-20260328-102030.zip`
- 本地压缩包（tar.gz）：`backups/archives/voiceinsight-saas-backup-v1.0.0-20260328-102030.tar.gz`
- 本地校验文件：`backups/voiceinsight-saas-backup-v1.0.0-20260328-102030/SHA256SUMS.txt`
- 元信息：`backups/voiceinsight-saas-backup-v1.0.0-20260328-102030/backup.meta.json`
- 本地分支：`backup/voiceinsight-saas-v1.0.0-20260328`
- 本地 Tag：`backup-voiceinsight-saas-v1.0.0-20260328`
- 本地 Commit：`13f6bb492c6cfe821b4025e6e09bac6da7ba0aa0`
- 云端仓库（origin）：`git@github.com:hrduan08/Product_analysis.git`
- 云端分支：`refs/heads/backup/voiceinsight-saas-v1.0.0-20260328`
- 云端 Tag：`refs/tags/backup-voiceinsight-saas-v1.0.0-20260328`
- 云端校验 Commit：`13f6bb492c6cfe821b4025e6e09bac6da7ba0aa0`（`git ls-remote` 已校验）

## 备份 2026-03-28 (v1.1.0 Side Panel 上架版)
- 版本号：`v1.1.0`
- 日期：2026-03-28
- 范围：`packages/extension` 完整快照
- 说明：v1.1.0 插件上架版完整备份，用于故障一键回退
- 本地目录快照：`backups/voiceinsight-extension-backup-v1.1.0-20260328-095241`
- 本地压缩包（zip）：`backups/archives/voiceinsight-extension-backup-v1.1.0-20260328-095241.zip`
- 本地压缩包（tar.gz）：`backups/archives/voiceinsight-extension-backup-v1.1.0-20260328-095241.tar.gz`
- 本地校验文件：`backups/voiceinsight-extension-backup-v1.1.0-20260328-095241/SHA256SUMS.txt`
- 本地分支：`backup/voiceinsight-extension-v1.1.0-sidepanel-20260328`
- 本地 Tag：`backup-voiceinsight-extension-v1.1.0-sidepanel-20260328`
- 本地 Commit：`a2964fecc79de3bb158f2c01b368eda1df79ac2b`
- 云端仓库（origin）：`git@github.com:hrduan08/Product_analysis.git`
- 云端分支：`refs/heads/backup/voiceinsight-extension-v1.1.0-sidepanel-20260328`
- 云端 Tag：`refs/tags/backup-voiceinsight-extension-v1.1.0-sidepanel-20260328`
- 云端校验 Commit：`a2964fecc79de3bb158f2c01b368eda1df79ac2b`（`git ls-remote` 已校验）

## 备份 2026-03-08 (v1.0.4 Side Panel 改造前)
- 版本号：`v1.0.4`
- 日期：2026-03-08
- 范围：`packages/extension` 完整快照
- 说明：迁移 Side Panel 前的插件完整备份，用于故障一键回退
- 本地分支：`backup/voiceinsight-extension-v1.0.4-pre-sidepanel-20260308`
- 本地 Tag：`backup-voiceinsight-extension-v1.0.4-pre-sidepanel-20260308`
- 本地 Commit：`ea15779248e72e882ce079328c4400f76d2c7f0c`
- 云端仓库（origin）：`git@github.com:hrduan08/Product_analysis.git`
- 云端分支：`refs/heads/backup/voiceinsight-extension-v1.0.4-pre-sidepanel-20260308`
- 云端 Tag：`refs/tags/backup-voiceinsight-extension-v1.0.4-pre-sidepanel-20260308`
- 云端校验 Commit：`ea15779248e72e882ce079328c4400f76d2c7f0c`（`git ls-remote` 已校验）

## 备份 2026-02-14-2
- 版本号：`v2026.02.14-2`
- 日期：2026-02-14
- 范围：当前仓库完整快照（Agent 完整功能版本）
- 说明：移除 Agent 方案前的完整功能备份
- 本地分支：`backup-20260214-1713`
- 本地 Tag：`无`
- 本地 Commit：`ac4f7441a7781ae9d3cf861b5538c60b84352c14`
- 云端仓库（origin）：`git@github.com:hrduan08/Product_analysis.git`
- 云端分支：`未推送`（`git ls-remote --heads origin backup-20260214-1713` 无结果）
- 云端 Tag：`无`
- 云端校验 Commit：`未校验`

## 备份 2026-02-14
- 版本号：`v2026.02.14-1`
- 日期：2026-02-14
- 范围：当前仓库完整快照
- 说明：修改 Agent.pkg安装包，本地测试通过，本地能安装、字幕下载成功
- 本地分支：`backup-20260214-1313`
- 本地 Tag：`无`
- 本地 Commit：`fbbc829b7409c28d453b0abebee725625029bc31`
- 云端仓库（origin）：`git@github.com:hrduan08/Product_analysis.git`
- 云端分支：`未推送`（`git ls-remote --heads origin backup-20260214-1313` 无结果）
- 云端 Tag：`无`
- 云端校验 Commit：`未校验`

## v2026.02.14-3
- 日期：2026-02-14
- 范围：`packages/extension/background.js` `packages/extension/popup.js` `packages/extension/popup.html` `packages/extension/popup.css` `packages/extension/manifest.json`
- 变更：移除 Agent 依赖，扩展直接抓取字幕并保存到浏览器下载目录；同步清理安装/本地服务相关 UI 与权限。

## v2026.02.14-4
- 日期：2026-02-14
- 范围：`packages/extension/background.js` `packages/extension/contentScript.js`
- 变更：仅保留“读播放器字幕轨道 → 请求字幕文件”的流程，移除转录面板 DOM 兜底。

## v2026.02.14-5
- 日期：2026-02-14
- 范围：`packages/extension/background.js`
- 变更：在页面主世界读取字幕轨道（解决隔离世界无法访问 getPlayerResponse 的问题），并增加短轮询等待轨道就绪。

## v2026.02.14-6
- 日期：2026-02-14
- 范围：`packages/extension/background.js`
- 变更：同一视频尝试所有字幕轨道（手动/自动）获取字幕，避免单轨道空内容导致失败。

## v2026.02.14-7
- 日期：2026-02-14
- 范围：`packages/extension/background.js`
- 变更：当轨道内容为空时，改用 timedtext type=list 拉取轨道列表，再逐轨道请求字幕。

## v2026.02.14-8
- 日期：2026-02-14
- 范围：`packages/extension/background.js`
- 变更：timedtext 列表解析为空时强制回退到页面上下文重拉并重解析；补充列表响应预览和轨道数调试日志。

## v2026.02.14-9
- 日期：2026-02-14
- 范围：`packages/extension/background.js`
- 变更：在 type=list 无轨道时，基于已有 captionTracks 的语言/类型组合直接逐个请求 timedtext，降低单一路径失效率。

## v2026.02.14-10
- 日期：2026-02-14
- 范围：`packages/extension/background.js` `packages/extension/contentScript.js`
- 变更：切换为仅 DOM 转录面板方案；后台不再走 timedtext 下载链路，改为读取页面转录面板文本并下载。

## v2026.02.14-11
- 日期：2026-02-14
- 范围：`packages/extension/contentScript.js` `packages/extension/background.js`
- 变更：增强 DOM 转录面板打开逻辑（先展开描述、优先命中“显示转录”按钮、优化更多菜单识别）；补充后台 DOM 拉取重试日志，便于定位失败原因。

## v2026.02.14-12
- 日期：2026-02-14
- 范围：`packages/extension/contentScript.js` `packages/extension/background.js`
- 变更：收紧“转录入口”匹配规则（避免把“字幕/CC”误判为转录）；增加转录打开失败调试信息回传到 Service Worker 日志。

## v2026.02.14-13
- 日期：2026-02-14
- 范围：`packages/extension/contentScript.js` `packages/extension/background.js`
- 变更：进一步放宽转录面板可见性判断并增强调试字段（候选按钮文本、菜单文本）；Service Worker 改为打印可复制的 JSON 调试日志。

## v2026.02.14-14
- 日期：2026-02-14
- 范围：`packages/extension/contentScript.js`
- 变更：补充 YouTube 新文案“内容转文字/轉寫”等转录入口关键词，修复按钮命中不到导致的 `transcript_panel_not_found`。

## v2026.02.14-15
- 日期：2026-02-14
- 范围：`packages/extension/background.js` `packages/extension/contentScript.js`
- 变更：字幕文件名改为 `VoiceInsight-视频标题.txt`；标题优先读取视频页可见标题，确保与用户看到的标题一致。

## v2026.02.14-16
- 日期：2026-02-14
- 范围：`packages/extension/background.js` `packages/extension/contentScript.js`
- 变更：统一清理标题尾部 `- YouTube` 后缀，确保下载文件名不会附带该后缀。

## v2026.02.14-17
- 日期：2026-02-14
- 范围：`packages/extension/popup.js` `packages/extension/popup.html` `packages/extension/popup.css`
- 变更：上线 P0+P1 引导：仅在字幕下载成功后显示关键词追踪引导；首次成功时展示一次性提示卡（可“暂不需要”）；文案改为“关键词追踪 + 定期搜索 + 飞书推送”并跳转到 `/app/search-config`。

## v2026.02.14-18
- 日期：2026-02-14
- 范围：`packages/extension/_locales/en/messages.json` `packages/extension/_locales/zh_CN/messages.json` `packages/extension/popup.js` `packages/extension/popup.html` `packages/extension/popup.css`
- 变更：插件名统一为 `VoiceInsight`，弹窗标题改为主标题 `VoiceInsight` + 副标题 `YouTube字幕助手`；“使用说明”改为“先打开视频页再点击插件下载”，并在首次下载成功后永久隐藏；移除 P1 与独立引流卡片，仅在“查看字幕”卡片内保留 P0 引导文案与跳转按钮。

## v2026.02.14-19
- 日期：2026-02-14
- 范围：`packages/extension/popup.js` `packages/extension/popup.html` `packages/extension/popup.css`
- 变更：弹窗标题改为单行 `VoiceInsight - YouTube字幕下载助手`；“使用说明”改为普通文本样式并使用 `使用说明：`；“查看字幕”卡片文案改为内嵌可点击 `VoiceInsight` 官网链接并移除独立引流按钮，同时将“下载”/“Downloads”词加粗显示。

## v2026.02.14-20
- 日期：2026-02-14
- 范围：`packages/extension/popup.js` `packages/extension/popup.html` `packages/extension/popup.css`
- 变更：标题改回主标题 `VoiceInsight` + 副标题 `YouTube 字幕下载助手`；恢复开始下载页“使用说明”普通文本展示（不再跨会话永久隐藏）；底部语言切换区改为随内容自适应贴底显示，修复下载前后底部留白不一致。

## v2026.02.16-1
- 日期：2026-02-16
- 范围：`packages/extension/manifest.json` `packages/extension/popup.js` `packages/extension/webAppBridge.js` `packages/extension/installers/*`
- 变更：上架安全版清理：最小化权限（移除 `cookies` 与非必要 host 权限）；移除官网桥接脚本注入；移除 Agent 安装脚本目录，避免上传包包含与当前功能无关资产。

## v2026.02.17-1
- 日期：2026-02-17
- 范围：`packages/extension/popup.html` `packages/extension/popup.css` `packages/extension/icons/brand-logo-128.png`
- 变更：弹窗标题前新增 VoiceInsight Logo，品牌呈现与宣传海报视觉保持一致。

## v2026.02.17-2
- 日期：2026-02-17
- 范围：`packages/extension/popup.html` `packages/extension/popup.css`
- 变更：调整标题区排版：Logo 仅与主标题同一行对齐，副标题改为独立一行并与主标题左对齐。

## v2026.02.17-3
- 日期：2026-02-17
- 范围：`packages/web/public/privacy/index.html` `packages/web/public/privacy-policy/index.html`
- 变更：新增 Chrome 应用市场审核所需的双语隐私政策页面（`/privacy`），并新增 `/privacy-policy` 到 `/privacy` 的跳转别名。

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
