import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// 该文件定义应用的根组件，负责挂载认证上下文与路由配置。
import { Navigate, Route, Routes } from 'react-router-dom'; // 引入路由组件以配置页面导航。
import { AuthProvider } from './contexts/AuthContext'; // 引入认证上下文提供者，管理全局登录状态。
import { LandingPage } from './pages/LandingPage'; // 引入首页组件。
import { SearchPage } from './pages/SearchPage'; // 引入搜索控制台组件。
import { TaskHistoryPage } from './pages/TaskHistoryPage';
import { DashboardPreviewPage } from './pages/DashboardPreviewPage';
import { AdminManualOrdersPage } from './pages/admin/AdminManualOrdersPage';
import { SubscriptionPage } from './pages/account/SubscriptionPage'; // 引入订阅管理页面组件。
import { SearchConfigPage } from './pages/account/SearchConfigPage'; // 引入搜索配置页面组件。
import { AdminDashboard } from './pages/admin/AdminDashboard'; // 引入后台仪表盘。
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'; // 引入忘记密码页面。
import { LoginPage } from './pages/auth/LoginPage'; // 引入登录页面。
import { RegisterPage } from './pages/auth/RegisterPage'; // 引入注册页面。
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'; // 引入重置密码页。
import { VerifyEmailCallbackPage } from './pages/auth/VerifyEmailCallbackPage'; // 引入邮箱验证回调页。
import { VerifyEmailNoticePage } from './pages/auth/VerifyEmailNoticePage'; // 引入邮箱验证提醒页。
import { PaymentPreviewPage } from './pages/PaymentPreviewPage';
import { PricingPage } from './pages/PricingPage';
import { FeedbackWidget } from './components/FeedbackWidget';
export function App() {
    return ( // 返回组件 JSX。
    _jsxs(AuthProvider, { children: [" ", _jsxs(Routes, { children: [" ", _jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), " ", _jsx(Route, { path: "/pricing", element: _jsx(PricingPage, {}) }), _jsx(Route, { path: "/preview/payment", element: _jsx(PaymentPreviewPage, {}) }), _jsx(Route, { path: "/preview/dashboard", element: _jsx(DashboardPreviewPage, {}) }), _jsx(Route, { path: "/app", element: _jsx(SearchPage, {}) }), " ", _jsx(Route, { path: "/app/task-history", element: _jsx(TaskHistoryPage, {}) }), " ", _jsx(Route, { path: "/app/search-config", element: _jsx(SearchConfigPage, {}) }), " ", _jsx(Route, { path: "/app/subscription", element: _jsx(SubscriptionPage, {}) }), " ", _jsx(Route, { path: "/admin/manual-orders", element: _jsx(AdminManualOrdersPage, {}) }), " ", _jsx(Route, { path: "/admin", element: _jsx(AdminDashboard, {}) }), " ", _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), " ", _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), " ", _jsx(Route, { path: "/verify-email", element: _jsx(VerifyEmailNoticePage, {}) }), " ", _jsx(Route, { path: "/email/verify", element: _jsx(VerifyEmailCallbackPage, {}) }), " ", _jsx(Route, { path: "/password/forgot", element: _jsx(ForgotPasswordPage, {}) }), " ", _jsx(Route, { path: "/password/reset", element: _jsx(ResetPasswordPage, {}) }), " ", _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) }), " "] }), _jsx(FeedbackWidget, {})] }));
} // 结束 App 组件定义。
