// 该文件封装与订阅计费相关的 API 请求，供前端页面调用以获取套餐和订阅信息。
import { API_BASE } from './api'; // 引入后端基础地址常量，用于拼接 API 请求路径。
// 定义获取套餐列表的函数。
export async function fetchPlans() {
    const response = await fetch(`${API_BASE}/api/billing/plans`); // 调用套餐列表接口。
    if (!response.ok) { // 如果返回状态非 200。
        throw new Error('获取套餐列表失败'); // 抛出错误提示调用方。
    }
    const data = (await response.json()); // 解析 JSON 并显式声明响应类型。
    return data.plans; // 返回套餐数组。
} // 结束函数定义。
// 定义获取用户订阅、发票的函数。
export async function fetchSubscription(userId) {
    const response = await fetch(`${API_BASE}/api/billing/subscription?userId=${encodeURIComponent(userId)}`); // 调用接口并传递用户 ID。
    if (!response.ok) { // 检查响应状态。
        throw new Error('获取订阅信息失败'); // 抛出错误提示调用方。
    }
    const data = (await response.json()); // 解析 JSON 包含订阅、发票、套餐和配额。
    return data; // 返回解析结果。
} // 结束函数定义。
// 定义创建订阅（模拟支付）的函数。
export async function createSubscriptionRequest(params) {
    const response = await fetch(`${API_BASE}/api/billing/subscription`, {
        method: 'POST', // 指定 POST 方法。
        headers: { 'Content-Type': 'application/json' }, // 设置请求头为 JSON。
        body: JSON.stringify(params) // 将参数序列化为 JSON 字符串。
    }); // 结束 fetch 调用。
    if (!response.ok) { // 判断请求是否成功。
        const errorBody = await response.text(); // 读取错误提示文本。
        throw new Error(errorBody || '创建订阅失败'); // 抛出错误信息。
    }
    const data = (await response.json()); // 解析返回的 JSON，其中包含配额信息。
    return data; // 返回创建结果给调用方。
} // 结束函数定义。
