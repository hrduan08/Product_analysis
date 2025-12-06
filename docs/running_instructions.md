# Demo 运行说明

> 快速启动指南，覆盖后端与前端服务，以及常见问题排查。

## 1. 环境准备
- Node.js ≥ 18（已验证 v22.17.0）
- pnpm（已通过 Corepack 启用 `pnpm 10.19.0`）
- `.env` 需配置：
  - `YOUTUBE_API_KEY`
  - `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`
  - `REDDIT_USERNAME` / `REDDIT_PASSWORD`
  - （可选）`REDDIT_USER_AGENT`
- 若访问外网需要代理，请设置 `HTTP_PROXY` / `HTTPS_PROXY`

## 2. 准备数据库（本地 Postgres）
> 远程 Supabase 在部分网络环境下不可用，因此推荐在本地启动 Postgres。

1. **启动容器**
   ```bash
   docker compose -f docker-compose.db.yml up -d
   ```
   - 默认占用 `localhost:6543`，数据持久化在仓库根目录的 `.data/postgres`。
   - 停止时可执行 `docker compose -f docker-compose.db.yml down`。
2. **配置 `.env`**
   - 将 `DATABASE_URL` 设置为 `postgresql://postgres:postgres@localhost:6543/product_insight?schema=public`
   - 将 `SHADOW_DATABASE_URL` 设置为 `postgresql://postgres:postgres@localhost:6543/postgres?schema=shadow`
3. **运行迁移与种子数据**
   ```bash
   pnpm --filter server exec prisma migrate deploy
   pnpm --filter server seed:plans
   ```
4. **验证连接**
   ```bash
   pnpm --filter server exec tsx scripts/test-db.ts
   ```
   看到 `数据库连接成功` 即可开始启动服务。

## 3. 启动后端（Express）
```bash
cd /Users/hmsz/Documents/AIProject/Product_analysis
pnpm --filter server dev
```
- 首次运行需确保 `.env` 已配置 YouTube 与 Reddit 所需密钥；若网络需代理，请设置 `HTTP_PROXY`/`HTTPS_PROXY`。
- 看到 `[server] listening on http://localhost:8080` 表示成功；启用代理时会提示 `[server] proxy enabled -> ...`。
- 终端保持运行，不要关闭。

验证接口（YouTube 平台）：
```bash
curl "http://localhost:8080/api/search?platform=youtube&query=Apple"
```
返回 JSON（包含 `items` 与 `pageInfo` 字段）即表示后端正常。若要验证 Reddit，可执行：
```bash
curl "http://localhost:8080/api/search?platform=reddit&query=Apple"
```
需保证 Reddit 凭证填写正确，并遵守官方速率限制（默认约 60 请求/分钟）。

## 4. 启动前端（Vite + React）
另开一个终端：
```bash
cd /Users/hmsz/Documents/AIProject/Product_analysis
pnpm --filter web dev
```
- 成功后终端显示 `Local: http://localhost:5173/`。
- 在浏览器访问 `http://localhost:5173`，输入关键词确认能展示视频列表。

若要构建生产包：
```bash
pnpm --filter web build
```
输出位于 `packages/web/dist/`。

## 5. 运行测试
- 后端（Vitest + Nock + Supertest）：
  ```bash
  pnpm --filter server test
  ```
- 前端（Vitest + Testing Library）：
  ```bash
  pnpm --filter web test
  ```
- 一次性运行所有工作区测试：
  ```bash
  pnpm test
  ```

建议在合并前执行一次完整测试，确保 YouTube 和 Reddit provider 修改未引入回归。

## 6. 常见问题排查
| 问题 | 可能原因 | 解决办法 |
| --- | --- | --- |
| `Error: 环境变量 YOUTUBE_API_KEY 未设置` | `.env` 未配置或文件不在根目录 | 复制 `.env.example` 为 `.env` 并填写真实 API Key |
| YouTube 请求超时（`Connect Timeout`） | 网络无法直连 Google | 设置 `HTTP_PROXY`/`HTTPS_PROXY`，并确保 Clash / VPN 已开启 |
| 前端访问 5173 报错 `ERR_CONNECTION_REFUSED` | Vite 服务未启动或被关闭 | 重新运行 `pnpm --filter web dev`，保持终端运行 |
| 端口 8080 被占用 (`EADDRINUSE`) | 已有程序占用同端口 | `lsof -i :8080` 查 PID 后 `kill <PID>`，或在 `.env` 修改 `PORT` |
| 请求 `/api/search` 返回 `SERVER_ERROR` | 后端未运行、API Key/OAuth 凭证无效或配额不足 | 确认后端日志，检查 Key/账号是否正确、配额是否耗尽 |

## 5. 目录速览
```
Product_analysis/
├─ packages/
│  ├─ server/  # Express 后端
│  └─ web/     # React + Vite 前端
├─ docs/       # 需求、设计、运行说明
└─ .env        # 本地环境变量（不会提交到仓库）
```

完成以上步骤即可在本地运行 Demo 并进行后续开发或调试。
