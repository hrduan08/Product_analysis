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

export function App(): JSX.Element { // 定义并导出 App 根组件。
  return ( // 返回组件 JSX。
    <AuthProvider> {/* 使用认证上下文包裹整个应用，提供登录状态 */}
      <Routes> {/* 配置路由表 */}
        <Route path="/" element={<LandingPage />} /> {/* SaaS 首页 */}
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/preview/payment" element={<PaymentPreviewPage />} />
        <Route path="/preview/dashboard" element={<DashboardPreviewPage />} />
        <Route path="/app" element={<SearchPage />} /> {/* 搜索控制台 */}
        <Route path="/app/task-history" element={<TaskHistoryPage />} /> {/* 执行记录列表 */}
        <Route path="/app/search-config" element={<SearchConfigPage />} /> {/* 搜索配置 */}
        <Route path="/app/subscription" element={<SubscriptionPage />} /> {/* 订阅管理页面 */}
        <Route path="/admin/manual-orders" element={<AdminManualOrdersPage />} /> {/* 待核实订单 */}
        <Route path="/admin" element={<AdminDashboard />} /> {/* 后台仪表盘 */}
        <Route path="/login" element={<LoginPage />} /> {/* 登录页面 */}
        <Route path="/register" element={<RegisterPage />} /> {/* 注册页面 */}
        <Route path="/verify-email" element={<VerifyEmailNoticePage />} /> {/* 验证提醒页面 */}
        <Route path="/email/verify" element={<VerifyEmailCallbackPage />} /> {/* 邮箱验证回调 */}
        <Route path="/password/forgot" element={<ForgotPasswordPage />} /> {/* 忘记密码页面 */}
        <Route path="/password/reset" element={<ResetPasswordPage />} /> {/* 重置密码页面 */}
        <Route path="*" element={<Navigate to="/" replace />} /> {/* 未匹配路由重定向至首页 */}
      </Routes>
      <FeedbackWidget />
    </AuthProvider>
  );
} // 结束 App 组件定义。
