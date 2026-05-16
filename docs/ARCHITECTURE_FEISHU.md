# VoiceInsight 技术架构（飞书版）

> 这是一份为飞书文档阅读场景优化的版本。  
> 目标：结构清晰、图示可见、可直接复制到飞书文档。

---

## 1. 文档定位与长期结构

### 1.1 这份文档负责什么
- 统一描述 VoiceInsight 各业务模块的技术架构。
- 定义稳定目录结构，保证后续扩展（插件、SaaS、调度、数据层）不推倒重来。
- 沉淀运行流程、失败排查手册、扩展接入规范。

### 1.2 稳定目录（后续长期不改一级结构）
- 0 文档治理
- 1 全局架构地图
- 2 Browser Extension（当前已完成）
- 3 SaaS Platform（预留）
- 4 Scheduler & Crawling（预留）
- 5 Data & Delivery（预留）
- 6 失败排查手册（跨模块）
- 7 扩展接入规范（跨模块）
- 8 架构变更记录

### 1.3 当前已完成范围
- 已完整梳理：**Browser Extension（YouTube 字幕提取）**
- 预留待补充：SaaS 平台、调度抓取、数据层、推送层

---

## 2. 全局架构地图（可扩展）

### 2.1 四层架构（文本图，飞书可直接显示）

```text
[Client Layer]
  ├─ Browser Extension（已实现）
  └─ Web App / SaaS Console（待补充）
          │
          ▼
[Service Layer]
  ├─ API Gateway / Auth / Subscription（待补充）
  └─ Search Orchestrator（YouTube / Reddit / X，待补充）
          │
          ▼
[Execution Layer]
  ├─ Local Agent / Third-party Bridge（插件已使用）
  └─ Scheduler / Worker（待补充）
          │
          ▼
[Data & Delivery Layer]
  ├─ PostgreSQL / Redis / Object Storage（待补充）
  └─ Feishu Webhook / Email / Notification（待补充）
```

### 2.2 模块状态（去表格版）
- Browser Extension：Active（已详细梳理）
- SaaS Platform：Planned（已预留结构）
- Scheduler & Crawling：Planned（已预留结构）
- Data Architecture：Planned（已预留结构）
- Notification Delivery：Planned（已预留结构）

---

## 3. Browser Extension（当前重点）

### 3.1 模块目标
- 在 YouTube 视频页稳定提取字幕（多策略 fallback）。
- 支持下载、复制、时间戳显示。
- 提供可复制诊断日志，便于定位失败原因。

### 3.2 模块边界
- 插件只负责“字幕提取与展示”，不负责 SaaS 订阅配置管理。
- `contentScript`、`background` 不承载提取核心逻辑。
- 提取单点编排统一在 `popup.js`。

### 3.3 代码职责拆分（当前真实实现）
- `packages/extension/manifest.json`
  - MV3 清单，声明 side panel、权限、content script 注入。
- `packages/extension/background.js`
  - 仅负责 side panel 行为初始化。
- `packages/extension/contentScript.js`
  - 监听 YouTube SPA 导航，发送 `VI_ACTIVE_VIDEO_CHANGED`。
- `packages/extension/popup.html`
  - 面板 UI 容器（操作区、字幕区、诊断区）。
- `packages/extension/popup.shared.js`
  - 纯函数层：文本清洗、时间处理、导出格式、timedtext 解析。
- `packages/extension/popup.js`
  - 业务编排核心：状态机、fallback、诊断、导出下载。

### 3.4 用户主流程（从打开视频到拿到字幕）
1. 用户打开/切换 YouTube 视频。
2. `contentScript` 捕获导航事件，通知 popup 视频已切换。
3. 用户打开插件 side panel，触发初始化。
4. `refreshTranscript()` 执行提取主流程：
   - 识别当前活动视频
   - 检查本地 Agent（仅本地 API 场景）
   - 执行 fallback 链路
   - 归一化字幕 + 语言识别 + 时间戳对齐
   - 渲染面板
5. 用户执行下载/复制/手动刷新。

---

## 4. 时序图（飞书可见版）

> 飞书对 Mermaid 代码块显示不稳定，以下使用“文本时序图”表达。  
> 如果你后续要在飞书里转成流程图，直接按此图重建即可。

### 4.1 自动刷新主时序（文本图）

```text
User
  -> YouTube Page: 打开/切换视频
YouTube Page
  -> contentScript: yt-navigate-* / popstate / hashchange
contentScript
  -> contentScript: debounce + 解析 videoId
  -> popup: VI_ACTIVE_VIDEO_CHANGED
User
  -> popup: 打开插件面板
popup
  -> popup: init + bindEvents + startWatchers
  -> popup: refreshTranscript()
  -> popup: getActiveYoutubeTabInfo()
  -> VoiceInsight API/Agent: ensureVoiceInsightAgentReady()（条件触发）
  -> popup: fetchTranscriptWithFallback()
  -> popup: normalizeTranscriptEntries()
  -> popup: resolveTranscriptLanguageMetadata()
  -> popup: alignTranscriptDisplayTimestampsInBackground()
popup
  -> User: 渲染字幕、语言、状态
```

### 4.2 字幕提取 fallback 时序（文本图）

```text
popup
  -> popup: ensureMainWorldVideoContextReady
  -> MainWorld Captions Meta: prefetchCaptionTrackMetadata
  -> VoiceInsight API: 先走 VOICEINSIGHT_API（youtube-transcript-api -> yt-dlp）

  if API success:
    VoiceInsight API -> popup: timeline
  else:
    popup -> MainWorld Captions Meta: CAPTION_TRACK
    if CAPTION_TRACK success:
      MainWorld Captions Meta -> popup: timeline
    else:
      popup -> timedtext: TIMEDTEXT_LIST
      if TIMEDTEXT_LIST success:
        timedtext -> popup: timeline
      else:
        popup -> PAGE_CAPTURE: no-open -> open（最后兜底）
        PAGE_CAPTURE -> popup: timeline 或 error
```

---

## 5. 失败排查手册（插件）

### 5.1 统一入口
1. 打开调试面板（点击 logo 连续触发解锁）。
2. 点击“复制诊断日志”。
3. 优先看三段：
   - `FALLBACK_CHAIN` 到哪一步失败
   - `VOICEINSIGHT_API / CAPTION_TRACK / PAGE_CAPTURE` 哪段先报错
   - 最终 `Diag Code`

### 5.2 常见问题与处理
- 现象：提示“请先打开 YouTube 页面”
  - 原因：激活标签页不是 YouTube
  - 处理：切到真实视频页后手动刷新
- 现象：API 超时频繁
  - 原因：Agent 未就绪 / 网络抖动 / 引擎超时
  - 处理：先看 `/health`，再看诊断码 `E-TP-TIMEOUT`
- 现象：login_required
  - 原因：YouTube 登录或风控
  - 处理：确认 Cookie bridge 是否执行成功
- 现象：字幕轨道为空
  - 原因：视频无字幕或受限
  - 处理：检查 `no_caption_tracks / captions_not_found`
- 现象：切视频后字幕错位/仍是旧视频
  - 原因：SPA 上下文未稳定
  - 处理：看 `context_mismatch/context_not_ready`

### 5.3 五分钟分诊 SOP
1. 先判断“上下文错误”还是“字幕源不可用”。
2. 若上下文正常，定位 fallback 最后停在哪个策略。
3. 若 `PAGE_CAPTURE` 也失败，优先判断视频本身是否可提取。
4. 提交问题时必须附：视频链接 + 诊断日志 + 失败时间。

---

## 6. 新策略接入规范（插件）

### 6.1 接入原则
- 新策略必须接入 `popup.js` fallback 链，不允许分散实现。
- 纯解析逻辑放入 `popup.shared.js`，保持无副作用。
- 每一步都必须写 `addDiagStep`，确保可观测。
- 新策略失败不能中断后续 fallback。

### 6.2 标准接入步骤
1. 在 fallback 链注册新策略及优先级。
2. 定义策略 stage 命名（便于日志检索）。
3. 补齐错误映射：
   - `mapTranscriptErrorKey`
   - `deriveErrorCode`
4. 补齐业务日志文案：
   - `buildBusinessLogMessages`
5. 更新本架构文档对应章节。

### 6.3 完成定义（DoD）
- 语法/引用检查通过。
- 覆盖 3 类场景：
  - 成功提取
  - 失败并正确降级
  - 超时/异常不阻断链路
- 诊断日志可明确回答：
  - 是否进入该策略
  - 为什么失败
  - 最终是否回退成功

---

## 7. 后续模块预留模板（SaaS 等）

> 新模块统一按下面模板补，不改一级结构。

### `<ModuleName>`
- 模块目标与边界
- 代码架构与职责拆分
- 核心运行时序（文本图）
- 失败排查手册
- 扩展接入规范
- 变更记录

---

## 8. 关联文档

- 原始架构主文档：`docs/ARCHITECTURE.md`
- 插件实现侧说明：`packages/extension/README.md`
- 产品规格：`docs/product-Specification.md`
- 开发计划：`docs/youtube_demo_dev_plan.md`
- 运行说明：`docs/running_instructions.md`
- 测试用例：`docs/test-cases.md`
- 变更记录：`docs/CHANGELOG.md`

