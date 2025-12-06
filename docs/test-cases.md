# Product Insight Demo — 全量测试用例集 v3.0

> **目标**：覆盖产品说明书中所有功能、状态转换以及真实用户可能遭遇的正常/异常场景，确保达到商用级质量。  
> **更新时间**：2025-11-01  
> **适用版本**：`Product_analysis` 仓库当前主分支  
> **执行设备**：桌面端 Chrome 最新版（如需移动端请额外补充）  
> **说明**：若在执行过程中发现实际行为与预期不符，应记录缺陷并同步更新本测试集。

---

## 0. 记号与约定
- **TC-ID**：`模块缩写-序号`，如 `AUTH-REG-001`。  
- **前置**：执行前必须满足的环境、数据或登录状态。  
- **步骤**：按照序号依次执行；如需后台/数据库操作会单独指出。  
- **期望**：包含前端提示、数据库状态、告警日志、外部系统行为等。  
- **清理**：执行后需恢复的操作（如删除测试数据、还原配置）。  
- **状态简称**：`trialing`：试用中；`active`：已订阅；`past_due`：待续费；`expired`：过期；`canceled`：取消。

---

## 1. 环境准备检查

| TC-ID | 场景 | 前置 | 步骤 | 期望 | 清理 |
|-------|------|------|------|------|------|
| ENV-001 | `.env` 完整性 | 服务未启动 | 核对 `.env` 包含数据库、邮件、Slack、支付、Cron、Admin、第三方 API 变量；证书文件存在且路径正确 | 缺项列出；全部满足后方可进行其他测试 | 无 |
| ENV-002 | 数据库连通性 | `DATABASE_URL` 配置完成 | `pnpm --filter server exec tsx scripts/test-db.ts` | 控制台输出“数据库连接成功”；无错误栈 | 无 |
| ENV-003 | Prisma 迁移 | 无 | `pnpm --filter server exec prisma migrate status` | 所有 migration 状态为 applied | 无 |
| ENV-004 | Slack Webhook 验证 | Slack 频道已建 | `pnpm --filter server exec tsx scripts/trigger-alert.ts` | Slack 收到 info 告警；`alerts` 表新增 info 记录；`occurrences=1` | 删除测试告警记录（可选） |
| ENV-005 | 邮件发送 stub 验证 | `MAIL_PROVIDER=stub` | 任意触发邮件（例如注册） | 控制台输出 `[mail] stub send`；未向真实邮箱发送 | 无 |

---

## 2. 用户生命周期与状态

| TC-ID | 场景 | 前置 | 步骤 | 期望 | 清理 |
|-------|------|------|------|------|------|
| LIFE-001 | 新注册用户默认状态 | 无 | 注册新账号（详见 AUTH-REG-001） | `users.status=trialing`，`trial_ends_at=注册时间+1天` | 删除账号 |
| LIFE-002 | 试用到期同步 past_due | 有账号；将 `trial_ends_at` 手动设为过去时间 | 登录用户 → 调用任意受保护接口（例如 `/api/billing/subscription`） | `syncUserLifecycle` 将 `status` 更新为 `past_due`；搜索页面顶部显示“待续费” | 恢复试用或删除数据 |
| LIFE-003 | 试用到期后搜索权限 | LIFE-002 状态为 `past_due` | 在 `/app` 执行搜索 | **当前实现**：仍可搜索（记录结果）；若预期应限制，则记录缺陷 | 无 |
| LIFE-004 | 试用到期后升级 | LIFE-002 | 通过 mock 支付升级月度会员 | 支付成功后 `status=active`；`plan_expire_at` 设置为新周期结束时间 | 删除账号 |
| LIFE-005 | 订阅到期自动 past_due | 有 `active` 订阅，`plan_expire_at` 调整为过去时间 | 登录或刷新 token | `status` 自动更新为 `past_due`；订阅记录仍保持上次信息 | 删除账号 |
| LIFE-006 | 订阅到期后支付续费 | LIFE-005 | 再次发起 mock 支付成功 | `status=active`，`plan_expire_at` 推进一个周期；账单追加新纪录 | 删除账号 |
| LIFE-007 | 取消订阅状态（后台模拟） | 有 `active` 订阅 | 使用 `prisma.userSubscription.update` 将状态改为 `canceled` | `/app/subscription` 显示已取消；可重新升级 | 删除账号 |

---

## 3. 注册（含边界）

| TC-ID | 场景 | 前置 | 步骤 | 期望 | 清理 |
|-------|------|------|------|------|------|
| AUTH-REG-001 | 全字段合法注册 | 无 | `/register` 输入合法邮箱 `<email>`、密码 `Aa1!aaaa`、姓名“测试”、时区“Asia/Shanghai” → 提交 | 注册成功；自动跳转 `/app`；数据库记录符合 `LIFE-001` | 删除账号 |
| AUTH-REG-002 | 最小字段注册 | 无 | 仅填写邮箱+密码 | 成功；`user_profiles` 不存在/为空 | 删除账号 |
| AUTH-REG-003 | 重复邮箱 | AUTH-REG-001 完成 | 再次使用同邮箱注册 | 前端/后端返回“邮箱已被注册” (409) | 无 |
| AUTH-REG-004 | 邮箱大小写归一 | 无 | 使用大写邮箱注册 | 数据库保存为小写；再以小写登录成功 | 删除账号 |
| AUTH-REG-005 | 邮箱最大长度 | 无 | 测试 254 字符邮箱（+域名） | 成功；超出 254 应返回 422 | 删除账号 |
| AUTH-REG-006 | 密码下限 | 无 | 输入 8 位组合密码 | 成功 | 删除账号 |
| AUTH-REG-007 | 密码上限 | 无 | 输入 64 位密码 | 成功；65 位返回 422 | 删除 |
| AUTH-REG-008 | 密码仅数字 | 无 | `12345678` | **当前实现**：允许注册（若需增强需提需求） | 删除 |
| AUTH-REG-009 | 特殊字符密码 | 无 | 使用包含多种特殊字符密码 | 成功 | 删除 |
| AUTH-REG-010 | 邮件发送失败 | 临时设置 `MAIL_PROVIDER=sendgrid` 但 `MAIL_API_KEY` 错误 | 注册 | 控制台报错；注册流程仍成功；邮箱验证需手动重发 | 恢复 stub，删除账号 |
| AUTH-REG-011 | 高频注册限速 | 同一 IP | 快速提交 10 次注册不同邮箱 | 系统是否限速？记录实际行为（若无，记录需求） | 删除数据 |

---

## 4. 邮箱验证

| TC-ID | 场景 | 前置 | 步骤 | 期望 | 清理 |
|-------|------|------|------|------|------|
| EMAIL-001 | 首次验证成功 | 注册成功；获取验证链接（日志/数据库） | 打开 `/email/verify?token=` | 页面提示成功；`email_verified_at` 填值；状态仍 `trialing` | 删除账号 |
| EMAIL-002 | 验证链接过期 | 手动改 token 的 `expiresAt` 为过去时间 | 打开链接 | 返回 400；提示失效 | 删除账号 |
| EMAIL-003 | 验证后重复点击 | EMAIL-001 完成 | 再次访问 | 提示“邮箱已验证”；`email_verified_at` 不变 |
| EMAIL-004 | 重发验证成功 | 用户未验证 | `/verify-email` 点击“重新发送” | 返回 204；stub 输出邮件 | 删除账号 |
| EMAIL-005 | 重发失败（SendGrid） | 使用无效 API Key | 重发 | 返回错误；控制台记录失败；Slack 不应该报警（若报警需确认） | 恢复配置 |

---

## 5. 密码找回与安全

| TC-ID | 场景 | 前置 | 步骤 | 期望 | 清理 |
|-------|------|------|------|------|------|
| PWD-001 | 忘记密码申请 | 账号存在 | `/password/forgot` 输入邮箱 | 返回 204；stub 输出重置邮件 | 删除账号 |
| PWD-002 | 忘记密码+未注册 | 无 | 输入未注册邮箱 | 仍返回 204（防止邮箱枚举） | 无 |
| PWD-003 | 重置成功 | 获取 `password_reset` token | `/password/reset?token=` 输入新密码 `Bb2@bbbb` | 返回 204；`password_hash` 改变；旧 refresh token 被标记 revoked | 删除账号 |
| PWD-004 | 非法 token | 修改 token | 提交 | 返回 400 “链接无效或已过期” |
| PWD-005 | 重置弱密码 | 输入少于 8 位或空白 | 前端阻止/后端 422 | 无 |

---

## 6. 登录态与注销

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| SESSION-001 | 登录后刷新 | 已登录 | 刷新浏览器 | 仍保持登录状态；用户信息重新加载 |
| SESSION-002 | 多标签同步 | 登录后开新标签 | 标签 A 退出 → 切换标签 B | 若实现跨标签同步应跳登录；如未实现记录需求 |
| SESSION-003 | 切换账号 | 登录 A → 退出 → 登录 B | 搜索历史、账单等切换为 B 账号数据 |
| SESSION-004 | Token 过期刷新 | 手动将 access token 过期（改系统时间或等待） | 操作受保护接口 | 自动刷新；若刷新失败弹出重新登录 |
| SESSION-005 | 使用失效 refresh | 退出后使用旧 refresh 请求 `/refresh` | 返回 401 |

---

## 7. 搜索控制台（含权限）

### 功能场景

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| SEARCH-001 | YouTube 搜索成功 | 登录，API Key 有效 | 搜索 `Helio Strap` | 列表返回数据；summary 显示统计；历史记录更新 |
| SEARCH-002 | Reddit 搜索成功 | Reddit 凭证有效 | 搜索 `Amazfit` | 列表有结果；状态 Pill 显示正常 |
| SEARCH-003 | 空结果提示 | 输入无匹配词 | 提示“暂无结果”空态组件 |
| SEARCH-004 | 错误提示 | 暂时断网 | 搜索 | 显示错误消息、toast；状态 Pill=异常 |
| SEARCH-005 | 分页下一页 | 有 `nextCursor` | 下一页 | 列表更新；上一页按钮启用 |
| SEARCH-006 | 历史上限 | 连续搜索 7 个词 | 历史仅保留最近 5 条 |
| SEARCH-007 | 历史去重 | 搜索 “Product” → 再搜索 “product” | 历史只保留一条（大小写不敏感） |
| SEARCH-008 | 清空历史 | 点击“清空”→ 确认 | 当前平台历史清空 |

### 权限 & 状态场景

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| SEARCH-ACL-001 | 未登录访问 | 无 | 直接访问 `/app` | 显示访客 banner，提示登录；搜索栏禁用 |
| SEARCH-ACL-002 | 邮箱未验证用户 | 未验证状态 | 尝试搜索 | **当前实现**：允许搜索；横幅提示“邮箱未验证”并提供验证链接（若期望禁止需记录缺陷） |
| SEARCH-ACL-003 | 试用到期 | `status=past_due` | 执行搜索 | 行为与 LIFE-003 一致；如需限制需记录 |
| SEARCH-ACL-004 | 账户 canceled | `status=canceled` | 搜索 | 应仍可搜索（取决产品策略）；实际行为需记录 |

### 复制链接/操作

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| SEARCH-CLIP-001 | 复制成功 | 正常结果列表 | 点击复制按钮 | Toast “链接已复制”；剪贴板内容匹配 |
| SEARCH-CLIP-002 | 复制失败 | 禁用剪贴板（浏览器设置） | 点击复制 | Toast “复制失败，请手动复制” |

---

## 8. 订阅管理与套餐

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| SUB-001 | 当前套餐显示 | 有 trialing/active 状态 | `/app/subscription` | 显示当前状态、试用/到期时间、账户状态标签 |
| SUB-002 | 套餐列表正确 | `plans` 表包含 starter/pro/enterprise | 页面展示对应套餐名称、描述、价格、周期 | 套餐数量与 DB 一致 |
| SUB-003 | 配额信息 | `limits` JSON 有值 | 观察配额标签 | 通知渠道、关键词/成员上限、导出权限逐项显示 |
| SUB-004 | 未订购提示 | 无订阅 | 页面显示“尚未选择套餐”卡片 | |

---

## 9. 支付流程（模拟 + 实体）

### 模拟支付

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| PAY-MOCK-001 | 发起 mock 支付 | 将前端按钮改为 `handleCheckout(plan,'mock')` 或通过 network 覆写 | 点击月度会员“模拟支付”按钮 | 弹窗显示订单编号、金额、`provider=mock`、二维码链接 |
| PAY-MOCK-002 | 支付成功 | 记录 `orderId` | `POST /api/_dev/payments/{orderId}/mock-status` `{status:'paid'}` | 弹窗自动关闭；订阅升级；`payment_orders.status=paid`；`invoices` 关联订单；Slack 无告警 |
| PAY-MOCK-003 | 支付失败 | 同上 | `{status:'failed',reason:'MOCK_FAIL'}` | 弹窗显示错误；订单 `failed`；`alerts` 生成 `warning`；后台告警页可见 |
| PAY-MOCK-004 | 支付过期 | `{status:'expired',reason:'TIMEOUT'}` | 弹窗提示过期；订单 `expired`；告警记录 |
| PAY-MOCK-005 | 手动轮询中断 | 弹窗开启 | 点击“关闭” | 停止轮询；订单保持 `pending` |

### 免费套餐

| TC-ID | 场景 | 步骤 | 期望 |
|-------|------|------|
| PAY-FREE-001 | 启用免费套餐 | 点击免费套餐“立即启用” | 立刻升级；无需支付；账单新增金额 0 记录；用户状态 `active` |
| PAY-FREE-002 | 邮箱未验证 | 未验证邮箱尝试点击 | 接口返回错误（若当前允许则记录需求）；应提示先验证 |

### 微信/支付宝（待商用配置）

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| PAY-WX-001 | 微信下单成功 | 配置商户号、私钥、通知 URL | 点击微信支付，扫码并完成支付 | 订单 `paid`；订阅升级；日志记录回调成功 |
| PAY-WX-002 | 微信配置缺失 | 未配置 `WECHAT_PAY_MCHID` | 点击微信支付 | 弹窗显示“发起支付失败”；终端日志 `[payment] missing environment variable` |
| PAY-ALI-001 | 支付宝下单成功 | 配置 APP ID、密钥、网关、通知 URL | 支付成功 | 订单 `paid`；订阅升级 |
| PAY-ALI-002 | 支付宝金额不一致 | 修改回调金额 | 订单标记 `failed`；发送 critical 告警 |

---

## 10. 支付订单状态机 / 回调

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| PAY-STATE-001 | 微信回调成功 | pending 订单 + 构造合法 payload | `POST /api/billing/payments/notify/wechat` | 返回 200；订单 `paid`；`notify_payload` 保存原数据 |
| PAY-STATE-002 | 微信回调缺字段 | 缺 `out_trade_no` | 返回 400 “missing out_trade_no” |
| PAY-STATE-003 | 微信验签失败 | 修改签名 | 返回 500；Slack `payment:notify:wechat:error`；`alerts` 中记录 critical |
| PAY-STATE-004 | 支付宝回调成功 | 构造 `trade_status=TRADE_SUCCESS` | 订单 `paid` |
| PAY-STATE-005 | 支付宝重复回调 | 订单已 `paid` | 再次发送成功回调 | 接口返回 200；订单无重复处理（幂等） |
| PAY-STATE-006 | mock 回调 amount mismatch | `markOrderPaid` 传 `amountCents != order.amount_cents` | 订单 `failed`；critical 告警 `payment:amount-mismatch`；`last_error='AMOUNT_MISMATCH'` |

---

## 11. 账单与发票

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| BILL-001 | 生成发票（免费） | 启用免费套餐 | 查看账单表 | 显示金额“免费”，状态 paid |
| BILL-002 | 生成发票（付费） | mock 支付成功 | 查看账单 | 新增金额￥xx.xx，状态 paid；描述包含套餐名称 |
| BILL-003 | 发票关联订单 | 同上 | 检查数据库 `invoices.payment_order_id` | 与订单 ID 对应 |

---

## 12. 运营后台

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| ADMIN-001 | 访问授权流程 | `.env.local` 未配置令牌 | 访问 `/admin` | 显示输入框；输入正确令牌后加载成功 |
| ADMIN-002 | 错误令牌 | 输入错误字符串 | 显示红色提示 `{"message":"无权限访问"}` |
| ADMIN-003 | 订单列表分页 | 创建 >50 个订单（脚本） | 访问页面 | 只显示最新 50 条；排序按 `created_at desc` |
| ADMIN-004 | 状态筛选 | 存在多状态订单 | 切换筛选 | 表格仅显示对应状态 |
| ADMIN-005 | 查单重试成功 | mock pending 订单 | 点击“查单重试” | 后端调用 `queryWechatTransaction` 模拟成功；订单刷新为 paid |
| ADMIN-006 | 查单重试失败 | 模拟返回失败状态 | 按钮提示“已标记为失败”；订单状态更新 |
| ADMIN-007 | 标记失败 | pending 订单 | 点击 → 输入 `手动失败` | 返回成功；订单 `failed`；`alerts` 增加 warning |
| ADMIN-008 | 标记过期 | 同上 | 输入 `手动过期` | 订单 `expired`；告警 warning |
| ADMIN-009 | 告警筛选 | 告警表包含不同级别 | 切换 Severity | 表格显示对应告警；点击 payload 展开 JSON |

---

## 13. 告警与通知体系

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| ALERT-001 | 手动告警 | Slack Webhook 有效 | `trigger-alert.ts` | Slack 接收 info；`alerts` 记录 |
| ALERT-002 | 限频机制 | 连续两次触发 `trigger-alert.ts` | 第一次发送成功；第二次仅增加 `occurrences`，不推送 Slack |
| ALERT-003 | 支付失败告警 | mock 标记失败 | Slack 接收 warning；后台告警页可见 |
| ALERT-004 | 金额异常告警 | PAY-STATE-006 | Slack 收到 critical；`alerts` 表 severity=critical |
| ALERT-005 | Cron 失败告警 | 移除 API Key 运行 Cron | Slack critical；`alerts` 记录；`notify_jobs` 写入失败信息 |
| ALERT-006 | Slack 未配置 | 删除 Webhook | 触发告警 | 控制台打印“未配置，跳过发送”；系统继续运行 |

---

## 14. 定时任务与自动化

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| CRON-001 | 关键词同步成功 | `CRON_ENABLED=true` | 启动服务等待 Cron 或手动执行 `runKeywordSync` | 控制台输出开始/完成；`feedback_items` 新增；`notify_jobs` status=success；邮件 stub 输出 |
| CRON-002 | 关键词同步失败 | 移除 API Key | 执行 Cron | `notify_jobs` status=failed；Slack critical |
| CRON-003 | 邮件发送条件 | `MAIL_SEND_EMPTY=false`、无新增数据 | Cron 完成 | 控制台打印“跳过邮件发送”；`total_sent=0` |
| CRON-004 | 订阅提醒成功 | 构造试用即将到期用户 | 运行 `runBillingReminderJob` | 控制台“试用提醒 X 个、续费提醒 X 个”；邮件发送成功 |
| CRON-005 | 订阅提醒失败 | 模拟邮件异常 | 执行 | Slack warning；无邮件发送 |
| CRON-006 | Cron 禁用 | `CRON_ENABLED=false` | 启动服务 | 控制台提示“已禁用”，不触发任务 |

---

## 15. 数据脚本与维护

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| SCRIPT-001 | 套餐初始化 | 无 | `seed-plans.ts` | 控制台输出成功，`plans` 表与脚本定义一致 |
| SCRIPT-002 | 订单列表脚本 | 有订单 | `list-payment-orders.ts` | 输出订单信息（含状态/金额） |
| SCRIPT-003 | 重试脚本成功 | pending mock 订单 | `retry-payment-order.ts <out_trade_no>` | 控制台提示成功；订单状态更新 |
| SCRIPT-004 | 过期脚本 | 订单超过 expires | `expire-payment-orders.ts` | 订单状态变为 expired |
| SCRIPT-005 | 异常扫描 | 存在失败/过期订单 | `scan-payment-anomalies.ts` | 控制台打印结构化日志；Slack 告警 |
| SCRIPT-006 | 删除用户脚本 | 指定 email 存在 | `delete-user-by-email.ts <email>` | 用户及关联数据删除 |
| SCRIPT-007 | 数据重置 | 任意 | `reset-test-data.ts` | users/subscriptions/orders/invoices/alerts/notify_jobs 全部清空 |

---

## 16. 安全与异常

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| SEC-001 | 后台接口未授权 | 无 | 调 `GET /api/admin/payments` 不带令牌 | 返回 401/403 |
| SEC-002 | 普通接口未登录 | 无 | 调 `POST /api/billing/subscription` | 返回 401（若当前未限制需记录） |
| SEC-003 | 邮箱未验证限制 | 未验证账号 | 调 `POST /api/billing/subscription` | 期望返回 400（若允许则记录需求） |
| SEC-004 | SQL 注入测试 | 搜索输入 `' OR 1=1` | 返回正常结果；无异常日志 |
| SEC-005 | XSS 输入 | 搜索 `<script>alert(1)</script>` | 页面无脚本执行，显示转义文本 |
| SEC-006 | 大量请求 | 使用工具并发 30 个注册请求 | 不应导致后端崩溃；若超连接池限制，日志提示，需评估调优 |
| SEC-007 | 支付接口错误输入 | 传递 `provider=unknown` | 返回 422/400 |
| SEC-008 | CSRF 验证 | 从第三方页面发起 POST 到 `/api/admin/...` | 因需要令牌，应返回未授权 |

---

## 17. 性能与可靠性

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| PERF-001 | 搜索大流量 | `CRON_FETCH_LIMIT=50`，数据库已有大量反馈 | 搜索高频词 | 页面响应时间可接受（<3s），正确分页 |
| PERF-002 | 订单并发 | 模拟脚本并发 20 次发起支付 | 生成 20 条 `pending` 订单，无连接池超时 |
| PERF-003 | Cron + 用户操作并发 | Cron 执行时手动搜索/支付 | 两者互不影响，无严重性能下降 |
| PERF-004 | 长时间运行 | 服务连续运行 24h | Cron、搜索、告警均正常；无内存泄漏迹象（需监控工具辅助） |

---

## 18. 数据清理与回归流程

| TC-ID | 场景 | 前置 | 步骤 | 期望 |
|-------|------|------|------|------|
| CLEAN-001 | 单个账号清理 | 指定邮箱存在 | `delete-user-by-email.ts <email>` | 成功提示；DB 中相关数据删除 |
| CLEAN-002 | 全量重置 | 任意 | `reset-test-data.ts` → `seed-plans.ts` | 所有用户/订阅/订单/发票/告警/任务记录清空，再重新初始化套餐 |
| CLEAN-003 | 回归冒烟 | 环境重置完毕 | 按以下流程执行：注册→验证→搜索→启用免费套餐→mock 支付升级→后台查单→查看告警 | 全链路无异常；若存在问题记录缺陷 |

---

## 19. 备注
- 若功能新增或变更，请先更新 `docs/product-Specification.md`，再同步修改本测试集。  
- 对于未实现但在规格中要求的行为（例如试用到期禁止搜索），若测试结果不符，应视为缺陷或产品待实现项。  
- 建议在测试管理平台建立用例条目并与自动化脚本绑定，以便持续回归。***
