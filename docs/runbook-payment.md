# 支付与订阅运维手册

## 环境变量
- `WECHAT_PAY_*`：商户号、AppID、证书序列号、私钥、API v3 Key、通知地址、平台证书。
- `ALIPAY_*`：AppId、私钥、公钥、网关、通知地址。
- `ADMIN_TOKEN`：后台接口访问令牌。
- `ALERT_SLACK_WEBHOOK`：Slack Incoming Webhook 地址，用于发送支付/任务告警。
- `MAIL_PROVIDER`、`MAIL_TO`、`MAIL_API_KEY`：邮件发送配置。测试/CI 可设为 `MAIL_PROVIDER=stub` 以禁用真实发信。
- `PAYMENT_ORDER_PREFIX`、`PAYMENT_EXPIRE_MINUTES`：订单号前缀、超时时间。

## 常用脚本
- 查看订单：`pnpm --filter server report:payments`
- 手动查单并重试：`pnpm --filter server retry:payment <orderId>`
- 标记超时订单：`pnpm --filter server expire:payments`
- 扫描异常并触发告警：`pnpm --filter server scan:payments`
- E2E 模拟支付：`pnpm test:e2e`（需要配置 `DATABASE_URL`、`ADMIN_TOKEN`，默认使用 `MAIL_PROVIDER=stub`）

## 管理接口
- `GET /api/admin/payments?status=pending`
- `POST /api/admin/payments/:orderId/retry`
- `POST /api/admin/payments/:orderId/fail`（标记为失败，可附加 reason）
- `POST /api/admin/payments/:orderId/expire`（手动过期，可附加 reason）
- `GET /api/admin/subscriptions`
- `GET /api/admin/alerts?severity=critical`
- 开发环境：`POST /api/_dev/payments/:orderId/mock-status`

## 告警体系
- 核心异常（支付失败、金额不符、回调报错、定时任务失败）会写入 `alerts` 表并按严重级别推送到 Slack，默认 15 分钟限频。
- 告警字段：
  - `severity`：`info` / `warning` / `critical`
  - `dedupe_key`：用于限频与合并，重复触发会累计 `occurrences`
  - `payload`：JSON 结构化详情，可在后台页面或 DB 中查看
- 后台 `/admin` 页面提供“告警”标签页，可按严重级别筛选最近 50 条记录。
- 若 Slack 未配置，会在控制台打出提示但不会中断业务。

## 运营流程
1. **支付回调失败**
   - 打开 `/admin` → “告警” 标签页，查看是否存在相关失败记录；
   - 检查日志（`[payment][failed]`），确认三方回调内容；
   - 手动调用 “查单重试” 或 “标记失败” 操作；必要时联系用户重新支付。
2. **订单超时**
   - Cron (scan/expire) 或脚本标记 expired，并触发 `warning` 告警；
  - 可在后台使用“标记过期”按钮手动处理并备注原因；
   - 通知用户重新发起支付。
3. **试用提醒/续费提醒未发送**
   - 查看 Email 发送日志或告警面板；
   - 确认 SendGrid 配额、`BILLING_REMINDER_*` 配置；如在测试环境，可改用 `MAIL_PROVIDER=stub` 验证流程。

## 前端操作提示
- 访问 `/admin` 后台，输入 `ADMIN_TOKEN` 或在 `.env.local` 设置 `VITE_ADMIN_TOKEN`。
- “支付订单”页：
  - **查单重试**：调用三方查单接口；
  - **标记失败/过期**：直接更新订单状态并写入原因，触发相应告警。
- “告警”页：支持按照 severity 筛选，展开 payload 查看结构化上下文。

## 证书更新
- 微信：下载新平台证书 → 更新 `WECHAT_PAY_PLATFORM_CERT_PATH`。
- 支付宝：重新生成 RSA2 私钥 → 更新 `.env` 私钥/公钥路径。

## 上线检查
- 执行 `pnpm --filter server exec prisma migrate deploy`
- `pnpm --filter server build`、`pnpm --filter server test`
- 配置环境变量与证书
- 验证 `/api/billing/payments/checkout` + 回调链路（可用沙箱或 `/api/_dev/payments/:id/mock-status`）
- 确认 Slack 告警、后台告警页能正常显示最新记录
