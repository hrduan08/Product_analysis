// 该文件负责初始化 Express 应用、注册中间件与路由，并导出供 server/index.ts 使用。

import "./load-env.js"; // 加载环境变量配置，确保后续代码能读取 .env 内容。

import { ProxyAgent, setGlobalDispatcher } from "undici"; // 引入 undici 代理工具，用于配置 HTTP(S) 代理。
import cors from "cors"; // 引入 cors 中间件以允许跨域请求。
import express from "express"; // 引入 express 构建 HTTP API 服务。

import authRouter from "./routes/auth.js"; // 引入认证相关路由模块。
import billingRouter from "./routes/billing.js"; // 引入订阅计费相关路由模块。
import paymentRouter from "./routes/payment.js"; // 引入支付路由模块。
import adminRouter from "./routes/admin.js"; // 引入后台路由模块。
import paymentTestRouter from "./routes/payment-test.js"; // 引入支付测试路由。
import searchRouter from "./routes/search.js"; // 引入搜索相关路由模块。
import searchConfigRouter from "./routes/search-config.js"; // 引入搜索配置路由。
import feedbackRouter from "./routes/feedback.js";
import taskHistoryRouter from "./routes/task-history.js";
import { errorHandler } from "./middlewares/error-handler.js"; // 引入统一错误处理中间件。

const httpsProxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY; // 从环境变量读取代理地址（若存在）。
if (httpsProxy) { // 判断是否配置了代理。
  const proxyAgent = new ProxyAgent(httpsProxy); // 创建代理 Agent。
  setGlobalDispatcher(proxyAgent); // 将代理设置为 undici 全局调度器，使所有请求走代理。
  console.log(`[server] proxy enabled -> ${httpsProxy}`); // 输出代理启用日志便于调试。
}

const app = express(); // 创建 Express 应用实例。

app.use(cors()); // 应用 cors 中间件，允许跨域访问。
app.use(
  express.json({
    limit: '20mb',
    verify: (req, _res, buf) => {
      try {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString('utf8');
      } catch {
        // ignore errors when storing raw body
      }
    }
  })
); // 使用内置 JSON 解析中间件处理 JSON 请求体，并保留原始字符串用于验签。
app.use(express.urlencoded({ extended: false, limit: '20mb' })); // 解析表单数据，供支付宝回调使用。

app.get("/health", (_req, res) => { // 定义健康检查接口，供部署监控使用。
  res.json({ status: "ok", timestamp: new Date().toISOString() }); // 返回服务状态和时间戳。
}); // 完成健康检查路由定义。

app.use("/api/auth", authRouter); // 将认证路由挂载到 /api/auth 前缀。
app.use("/api/billing", billingRouter); // 将订阅路由挂载到 /api/billing 前缀。
app.use("/api/billing/payments", paymentRouter); // 支付相关路由。
app.use("/api/admin", adminRouter); // 后台管理接口。
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/_dev/payments', paymentTestRouter);
}
app.use("/api", searchRouter); // 将搜索路由挂载到 /api 前缀下。
app.use("/api", searchConfigRouter); // 搜索配置相关接口。
app.use("/api", feedbackRouter);
app.use("/api", taskHistoryRouter);

app.use(errorHandler); // 注册统一错误处理中间件。

export default app; // 导出 app 实例供 server/index.ts 启动服务。
