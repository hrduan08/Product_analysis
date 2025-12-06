# YouTube & Reddit 反馈抓取 Demo 开发计划

> 阶段 0~3（YouTube 单平台 Demo）已完成，验证了输入关键词 → 抓取 YouTube 视频 → 前端展示的最小闭环。接下来在此基础上扩展 Reddit 支持，并为质量保障和部署做好准备。每个阶段给出目标、任务、产出与验证点，方便边学边做、循序推进。

---

## 阶段 0（已完成）：环境与准备
- 安装 Node.js 18+、pnpm、Git、VS Code 等工具。
- 初始化项目结构（`packages/web`、`packages/server`）、配置 ESLint / Prettier / `.editorconfig`。
- 申请 YouTube Data API Key，创建 `.env` 并填入 `YOUTUBE_API_KEY`、代理配置。
- **验证**：`node -v`、`pnpm -v` 正常；`.env` 存在；能够 `curl` 调试 YouTube API。

## 阶段 1（已完成）：后端基础 API
- 搭建 Express 服务，提供 `GET /api/videos?query=`。
- 实现 `validateQuery`、错误处理中间件，对接 YouTube `search.list` + `videos.list`。
- `curl http://localhost:8080/api/videos?query=Apple` 返回视频列表。

## 阶段 2（已完成）：前端基础框架
- 使用 Vite + React + TypeScript 初始化前端，完成 API 调用、列表渲染。
- 构建基本页面结构：搜索框、结果列表、分页占位。
- 浏览器访问 `http://localhost:5173`，输入关键词可看到 YouTube 数据。

## 阶段 3（已完成）：UI 与交互优化
- 按原型实现搜索面板、卡片样式、分页控件。
- 引入历史查询、复制链接、抓取时间等交互；处理加载骨架、空状态、错误提示。
- 桌面端/移动端响应式布局自检，体验与原型相符。

---

## 阶段 4：平台抽象与接口重构
- **目标**：将现有单平台接口改为多平台结构，保持 YouTube 正常运行并为 Reddit 接入铺路。
- **任务与步骤**
  1. **重命名接口并统一路由**
     - 删除 `routes/videos.ts`，新建 `routes/search.ts`，暴露 `GET /api/search`。
     - 请求参数：`platform`（必填，校验 youtube/reddit）、`query`（必填）、`cursor`（可选，兼容 `pageToken`）。
     - 在 `index.ts` 中注册新路由，保留 `/health`。
     - 更新 `validate-query.ts` & 新增 `validate-platform.ts`，确保非法参数返回 400。
     - 手动运行 `curl "http://localhost:8080/api/search?platform=youtube&query=Apple"` 验证。
  2. **抽象 Provider 架构**
     - 在 `types/search.ts` 定义 `SearchProvider`, `SearchResult`, `FeedbackItem`。
     - 将原 YouTube 逻辑迁至 `providers/youtube-provider.ts`，实现 `search({ query, cursor, limit })`。
     - `providers/index.ts` 中注册 `youtube: new YoutubeProvider()`、`reddit: new MockRedditProvider()`（占位）。
     - 后续接入 Reddit 只需替换 provider 实现即可。
  3. **统一响应数据模型**
     - 统一字段：`id`, `title`, `author`, `url`, `permalink`, `publishedAt`, `fetchedAt`, `thumbnailUrl`, `viewCount`, `score`, `labels`。
     - `pageInfo` 使用 `totalResults`、`resultsPerPage`、`nextCursor`、`prevCursor`，不同平台负责转换。
  4. **前端适配**
     - 更新 `services/api.ts`，封装 `searchFeedback({ platform, query, cursor })`。
     - 新建 `useFeedbackSearch` Hook，管理 `platform`、`lastQuery`、`pageInfo`、`error`、`loading`。
     - `SearchBar` 增加平台切换按钮；`VideoList` 根据平台渲染卡片；新增状态条、Toast、分页按钮禁用逻辑。
- **产出**：后端多平台接口可用；前端切换平台后仍能展示 YouTube 数据（Reddit 暂为 placeholder）。
- **验证**：运行 `pnpm --filter server dev`，手动 `curl` 验证；前端切换平台与分页操作无报错。

## 阶段 5：接入 Reddit Provider
- **目标**：实现 Reddit 帖子抓取与分页，返回真实数据。
- **任务与步骤**
  1. **申请 Reddit 脚本应用**
     - 登录 https://www.reddit.com/prefs/apps → “create another app”。
     - App type 选 `script`，redirect URI 可写 `http://localhost`。
     - 记录 `client id`（personal use script）与 `secret`，并为账号设置 Reddit 密码（不要用 Google 登录邮箱）。
     - 将 `REDDIT_CLIENT_ID`、`REDDIT_CLIENT_SECRET`、`REDDIT_USERNAME`、`REDDIT_PASSWORD`、`REDDIT_USER_AGENT` 写入 `.env`。
  2. **实现 Token Manager**
     - 新建 `auth/reddit-token-manager.ts`，使用用户名/密码 + client id/secret 调用 `https://www.reddit.com/api/v1/access_token` 获取 token。
     - 缓存 token（expires_in - 60 秒），401 时清除缓存保证下次刷新。
     - 提供 `getToken()` 返回 `{ token, userAgent }`。
  3. **实现 RedditProvider**
     - 文件 `providers/reddit-provider.ts`：调用 `https://oauth.reddit.com/search`，带上 Bearer token 与 User-Agent。
     - 支持 `after`/`before` 分页，映射字段（标题、作者、subreddit、score、permalink、thumbnail）。
     - 针对 401/403/429 打印日志并抛出错误，401 时调用 `tokenManager.clear()`。
  4. **前端渲染**
     - 从 Provider 返回的数据包含 `platform: 'reddit'`、`labels[0] = subreddit`、`score`、`permalink`。
     - `VideoList` 根据平台显示子版块/得分、permalink；`SearchBar` 平台切换后自动触发搜索。
- **产出**：`/api/search?platform=reddit&query=Apple` 返回真实帖子；前端 Reddit 卡片展示完整信息。
- **验证**：手动测试多组关键词与分页；关闭代理或提供错误凭证时观察错误提示是否友好。

## 阶段 6：多平台体验强化
- **目标**：在 YouTube + Reddit 双平台下统一体验，对齐新版原型 HTML。
- **任务与步骤**
  1. **平台切换逻辑**：SearchBar 默认选中 YouTube，切换按钮仍能触发同一关键词搜索；切换时保持输入框内容，滚动回顶部。
  2. **历史记录优化**：历史记录按平台分别存储在 localStorage；Chip 支持横向滚动，点击 Chip 触发搜索，清空时弹确认。
  3. **卡片样式统一**：
     - YouTube 卡片显示缩略图、频道名、观看量、抓取时间。
     - Reddit 卡片显示子版块（r/xxx）、得分、permalink、抓取时间。
     - hover 效果保持一致（阴影、下划线）。
  4. **状态反馈**：
     - 添加状态条显示各平台的抓取状态（正常/异常）。
     - Loading 用 Skeleton 替换空白页，空态使用统一插画。
     - Toast 提示复制成功/失败、错误信息（授权失败、速率限制）。
  5. **分页体验**：上一页/下一页按钮在无数据时禁用，翻页后滚动至顶部。
- **产出**：前端界面与 `docs/youtube_demo_prototype.html` 一致，用户在两平台之间切换毫无违和感。
- **验证**：手动体验加载、空、错误、复制、分页；在移动端模拟器检查响应式布局。

## 阶段 7：质量保障
- **目标**：为长期运行和协作打基础。
- **任务与步骤**
  1. **后端测试**：
     - 使用 Vitest + nock 测试 `YoutubeProvider` 和 `RedditProvider`（401/429 等场景）。
     - 使用 supertest 对 `/api/search` 做集成测试，验证平台参数、错误返回。
     - 在 `pnpm --filter server test` 中集成执行。
  2. **前端测试**：
     - 用 React Testing Library 编写 SearchBar、VideoList、Toast 等组件测试。
     - 覆盖平台切换、空态、复制操作等关键交互。
  3. **文档整理**：更新 `docs/running_instructions.md`，包含环境变量、代理配置、测试命令、常见错误排查。
  4. **手工回归**：制定 checklist（桌面/移动、代理打开/关闭）并执行一次完整体验。
- **产出**：后端/前端测试用例、运行文档、回归记录。
- **验证**：CI 或本地 `pnpm test` 通过，手工演示整个流程无阻塞。

## 阶段 8（可选）：部署与演示
- **目标**：将 Demo 发布到公网环境，方便评审或用户体验。
- **任务与步骤**
  1. **后端部署**：
     - 选择 Render Web Service（免费层）；配置环境变量（API Key、Reddit 凭证、代理）。
     - 构建命令 `pnpm install --frozen-lockfile && pnpm --filter server build`，启动命令 `node packages/server/dist/index.js`。
     - 验证 `https://<service>.onrender.com/api/search?platform=youtube&query=Apple` 能返回数据。
  2. **前端部署**：
     - 使用 Vercel 导入仓库，构建命令 `pnpm --filter web build`，输出目录 `packages/web/dist`。
     - 配置 `VITE_API_BASE_URL` 指向 Render 域名。
     - 验证 `https://<project>.vercel.app` 页面可正常搜索。
  3. **演示准备**：
     - 整理演示脚本（示例关键词、平台切换、错误演示）。
     - 截图或录屏关键页面，备份演示素材。
- **产出**：线上访问地址、演示材料。
- **验证**：外网访问检查、部署日志无报错；准备演示文档或 PPT。

---

## 阶段 9：后台自动抓取与存储
- **目标**：实现定时抓取、增量识别和数据库落地，为邮件推送打基础。
- **任务与步骤**：
  1. **接入数据库**（本阶段着重于 Postgres + Prisma，下一阶段再补充表结构与任务逻辑）：
     - 选择托管 Postgres（Supabase/Railway/Neon）。以 Supabase 为例创建项目，获取 `DATABASE_URL`，写入 `.env`。
     - 安装并初始化 Prisma：`pnpm add -D prisma`、`pnpm add @prisma/client`、`npx prisma init --schema packages/server/prisma/schema.prisma`，设置 datasource 使用 `env("DATABASE_URL")`。
     - 创建 `packages/server/src/db/prisma.ts` 导出 `prisma` 实例，并在 `package.json` 加 `postinstall: prisma generate`。
     - 运行 `npx prisma migrate dev --name init` 验证迁移机制；如需，写脚本 `scripts/test-db.ts` 确认连接成功。
  2. **定义数据模型**：在 `schema.prisma` 中新增 `FeedbackItem`, `NotifyJob`, `Subscription` 等模型（可参考技术方案文档），执行 `prisma migrate dev` 生成真实表结构。
  3. **定时任务骨架**：在 server 增加 `cron` 模块（node-cron），读取配置关键词，调用 Provider 并 upsert 到 `feedback_items`。
  4. **增量过滤**：实现函数 `getNewItemsSince(lastRun)`，比较 `first_seen_at`/`last_seen_at` 识别新增记录；任务结束后写入 `notify_jobs`。
  5. **日志与容错**：记录任务开始/结束时间、新增条数、异常原因，为后续告警和监控做准备。
- **产出**：数据库落地的抓取记录、定时任务脚本、基础增量识别逻辑。
- **验证**：在本地或 Render Scheduler 触发一次任务，确认数据库有新增记录且无重复；查看日志或 `notify_jobs` 表状态为成功。

---

## 阶段 10：邮件推送 MVP
- **目标**：将新增内容整理为日报/周报邮件发送给用户。
- **任务与步骤**：
  1. 集成邮件服务：选择 SendGrid/Mailgun/AWS SES 等，配置 `.env`（`MAIL_PROVIDER_API_KEY`、`MAIL_FROM`、`MAIL_TO`）。本地可用 Nodemailer + SMTP 测试。
  2. 编写邮件模块：根据 `feedback_items` 中的增量数据生成 HTML 模板，按平台分组输出标题、作者、发布时间、跳转链接，也可附加子版块/观看量等信息。
  3. 调用邮件 API 发送：支持多个收件人或批量发送；若无新增内容，可跳过或发送“今日无更新”提示；记录发送结果。
  4. 整合定时任务：在阶段 9 的 cron 任务末尾调用邮件模块，实现“抓取→筛选→推送”的闭环。
- **产出**：可运行的邮件推送任务，至少支持一个固定邮箱接收日报/周报。
- **验证**：触发任务后收件人收到完整邮件，内容准确；检查邮件服务日志无报错。

---

## 阶段 11：订阅管理与多用户扩展（可选）
- **目标**：上线可收费的订阅体系，覆盖注册 → 试用 → 升级套餐 → 定时推送 → 退订/续费的完整闭环。
- **阶段产出**：
  - 用户账号体系（登录、邮箱验证、密码找回）。
  - 订阅管理后台（关键词、平台、频率、收件人配置）。
  - 试用期和套餐配额控制，支持多档套餐。
  - 支付集成（首选 Stripe Checkout，预留微信/支付宝扩展点）。
  - 升级版 Scheduler：按订阅推送、记录发送历史，支持退订。

### 11.1 开发里程碑

| 序号 | 里程碑 | 说明 |
| --- | --- | --- |
| M1 | 账号 & 邮箱验证 | 完成注册/登录、JWT、邮箱验证邮件、密码重置；落地 `users`/`user_profiles` 表。 |
| M2 | 订阅 CRUD + 试用配额 | 实现订阅创建/编辑/停用；写入 `subscriptions`、`subscription_keywords`；校验试用期 (7 天内关键词/订阅上限)。 |
| M3 | Scheduler 升级 | 改造定时任务，按用户订阅分批执行，合并邮件，记录 `subscription_runs`、`notify_jobs.user_id`。 |
| M4 | 支付接入 (Stripe Checkout) | 后端 `POST /api/billing/checkout`，创建 Checkout Session；Webhook 更新 `user_plans`、`payments`；前端新增套餐页。 |
| M5 | 退订 & 提醒 | 邮件退订链接、API 停用订阅；试用到期/套餐到期提醒邮件；管理员查看订阅和支付报表。 |
| M6 | 监控与上线 | 指标与告警（抓取失败、发送失败、支付失败）；编写 Runbook，准备灰度发布。 |

### 11.2 详细迭代步骤

1. **M1 账号体系（预估 3‑5 天）**
   - 表结构：`users`、`user_profiles`、Refresh Token 存储。
   - 接口：`/api/auth/register`、`/api/auth/login`、`/api/auth/refresh`、`/api/auth/email/verify`、`/api/auth/password/reset`。
   - 邮件服务：复用 SendGrid Single Sender 发送验证/重置邮件。
   - 前端：注册/登录表单、验证提醒、重置密码流程。

2. **M2 订阅管理（5‑7 天）**
   - 表结构扩展：`subscriptions` 新增 `user_id`、`frequency`、`send_to`、`is_active` 等字段；`subscription_keywords`；`plans` & `user_plans` 初始试用配置。
   - API：`GET/POST/PUT/DELETE /api/subscriptions`、`/api/subscriptions/:id/pause`、`/api/subscriptions/:id/resume`。
   - 试用限制：注册时写入 `trial_started_at`/`trial_ends_at`，订阅 API 校验关键词/订阅数是否超限。
   - 前端：订阅列表、创建/编辑模态框、配额提示。

3. **M3 Scheduler 升级（4‑6 天）**
   - Cron 读取活跃订阅，按用户时区（`user_profiles.timezone`）安排时间槽。
   - 每次任务：抓取 → 增量过滤 → 合并同一用户订阅 → 调用 `MailComposer`（新卡片模板可复用） → 调用 `sendMail`。
   - 记录 `notify_jobs` 新字段：`user_id`、`subscription_id`、`total_sent`、`mail_message_id`；新增 `subscription_runs`。
   - 实现退订 token（HMAC）与 API：`POST /api/subscriptions/:id/unsubscribe`。

4. **M4 支付接入（7‑10 天）**
   - Stripe：新增 `plans`（映射 Stripe Price ID）、`payments`、`user_plans`。
   - API：`POST /api/billing/plans`（读取可售套餐）、`POST /api/billing/checkout`（创建 Checkout Session）、`POST /api/billing/webhook`（Stripe 回调）。
   - 前端：套餐比较页面、Checkout 跳转、支付成功/取消页。
   - 本地/测试：使用 Stripe Test Key、Webhooks CLI (`stripe listen`)；文档记录如何切换生产 Key。
   - 预留微信/支付宝：规划统一 `payments.provider` 字段，日后接入国内支付复用同一回调流程。

5. **M5 提醒与扩展（4‑6 天）**
   - 试用到期提醒任务：Cron 每日扫描 `trial_ends_at` ≤ 24h 的用户，写入提醒邮件。
   - 套餐即将到期提醒（`plan_expire_at`）；套餐过期自动暂停订阅并发送通知。
   - 管理后台（或管理 API）：查看订阅、支付、手动续费 / 退款（可选）。
   - 邮件模板：新增试用即将到期、套餐到期、升级成功、退订成功等模板。

6. **M6 监控 & 上线（3‑5 天）**
   - 指标：抓取成功率、发送成功率、退信率、支付成功率、试用转化率。
   - 告警：Cron 失败、SendGrid 退信超阈值、支付回调失败、Stripe Risk 警示。
   - 日志：统一字段（`user_id`、`subscription_id`、`plan_id`、`keywords`、`external_request_id`）。
   - Runbook：代理/密钥管理、常见异常处理、数据库迁移、回滚步骤。

### 11.3 资源与协作建议

- **角色分工**：
  - 后端 A：Auth + Subscription API + Scheduler。
  - 后端 B：Billing/支付对接 + Webhook + 管理接口。
  - 前端：账号页、订阅管理页、套餐页、支付流程、状态提示。
  - QA：设计试用/付费/退订场景用例，覆盖异常情况（支付失败、抓取失败、退订）。
- **测试重点**：
  - 单元：计划引擎（配额计算）、支付回调处理、退订 token。
  - 集成：Stripe/微信沙盒支付、Cron + 邮件发送全链路、退订链接。
  - UAT：试用到期提醒、套餐续费、退订后不再发送。
- **发布策略**：
  - 先灰度给团队内部账号，观察 1‑2 周；确认 KPI（抓取/发送成功率）后再向外推广。
  - 保持 SendGrid 免费额度内（100 封/天）或升级套餐；支付需开通生产环境前准备 KYC。

---


---

## 节奏建议与学习提示
- 每阶段结束进行一次复盘，总结遇到的问题、查阅资料链接和解决方案。
- 配合 `docs/youtube_demo_learning_path.md` 针对性补充知识：OAuth、REST、前端状态管理等。
- 记录命令、环境变量、常见错误，逐步完善文档，方便自己或团队成员复用。
- 若时间有限，可先完成阶段 4~6（核心功能），阶段 7~8 在需要时再投入。
