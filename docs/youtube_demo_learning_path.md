# YouTube 反馈抓取 Demo 学习路线概览

面向新手开发者，按完成 Demo 所需的技术环节梳理需要了解的工具、语言和概念。每项只列出要掌握的范围，具体语法可在实践中查阅官方文档或教程。

---

## 1. Web 基础
- **HTML / CSS 基础**：理解页面结构、常见标签、盒模型、Flex/Grid 布局，便于实现交互原型。
- **JavaScript 基础**：变量、循环、函数、模块化、Promise、`async/await`、Fetch API。
- **TypeScript 入门**：类型注解、接口、基本类型、与 React/Node.js 的结合方式。

## 2. 前端栈（React + Vite）
- **React 核心概念**：函数组件、props/state、`useEffect`、`useState`、组件组合。
- **React Router（可选）**：若未来扩展多页面，可了解基本路由配置；当前 Demo 单页可不使用。
- **Hook 与状态管理**：自定义 Hook、全局状态管理的基本思路（Zustand/Redux 可后续扩展）。
- **Vite 构建工具**：项目初始化、开发服务器、`vite.config.ts` 中的代理与环境变量。
- **前端样式方案**：CSS Modules、Tailwind CSS 或 styled-components 中任一种；理解如何组织组件样式。
- **API 调用与错误处理**：`fetch`/`axios` 调用后端、处理 Loading/错误/空数据状态。
- **前端测试（选学）**：React Testing Library 基础，了解如何编写组件测试。

## 3. 后端栈（Node.js + Express）
- **Node.js 基础**：运行时概念、模块系统、`npm`/`pnpm` 包管理。
- **Express 框架**：路由定义、请求处理、响应格式、错误处理中间件、CORS 配置。
- **环境变量管理**：`dotenv` 使用、区分开发/生产环境配置。
- **调用外部 API**：`fetch`/`axios` 在 Node.js 中的使用、处理 HTTP 状态码与错误。
- **JSON 数据处理**：理解如何解析/组合 JSON、序列化/反序列化。
- **日志与调试**：`console.log` 基础、使用 VSCode 调试 Node.js 应用（断点、监视变量）。
- **基本安全意识**：API Key 保密、输入校验、防范常见错误。

## 4. YouTube Data API
- **Google Cloud Console 基础**：创建项目、启用 API、生成/管理 API Key。
- **YouTube Data API v3**：
  - `search.list` 和 `videos.list` 接口用途、必填参数。
  - API 配额体系、常见错误码、速率限制。
  - 使用 API Explorer/ Postman 测试请求。
- **响应数据结构**：熟悉 JSON 字段并映射到 Demo 的数据模型。

## 5. 项目管理与协作
- **Git 基础**：`clone`, `commit`, `branch`, `merge`, `push/pull`，以及基本冲突解决。
- **GitHub / GitLab**：托管代码、拉取请求（PR/MR）流程。
- **任务拆分**：将需求文档拆成开发任务、迭代计划。
- **文档工具**：Markdown、Mermaid（用于绘制架构示意）。

## 6. 测试与验证
- **接口测试**：Postman、Insomnia 或 VSCode REST Client，验证后端 API 正确性。
- **自动化测试（选学）**：
  - **前端**：React Testing Library + Vitest。
  - **后端**：Vitest/Mocha + Supertest（模拟 HTTP 请求）。
- **手动验收**：根据需求清单和原型逐项测试功能。

## 7. 部署与运维基础
- **前端部署**：了解 Vercel、Netlify 或静态站点托管流程。
- **后端部署**：Render、Railway、Fly.io 等 Node.js 服务部署步骤，环境变量设置。
- **域名与 HTTPS（可选）**：了解如何绑定自定义域名（后期扩展）。
- **日志查看**：在托管平台查看日志、排查错误。

## 8. 后续扩展可学习方向
- **API 限流与缓存**：LRU、Redis 的基本概念。
- **RESTful 设计规范**：标准的响应格式、分页、错误码设计。
- **多平台数据抓取**：了解 Reddit API、亚马逊抓取的挑战。
- **NLP 基础**：情感分析、关键词提取、主题聚类（后续版本需要）。
- **监控与告警**：使用 Logflare、Datadog 等工具的基础概念。

---

建议按上述顺序逐步掌握，从 Web/JavaScript 基础开始，逐渐扩展到前后端框架和外部 API。每完成一个阶段，可搭建对应模块并通过实践巩固。*** End Patch
