// 该文件提供创建带 HTTP 状态码的 Error 对象的辅助函数，方便统一错误处理。

/**
 * 创建一个带有 HTTP 状态码的错误对象。
 */
export function createHttpError(status: number, message: string): Error { // 定义函数接收状态码与错误信息。
  const error = new Error(message); // 新建标准 Error 对象存放错误信息。
  (error as { status?: number }).status = status; // 在 Error 对象上挂载自定义 status 属性。
  return error; // 返回带状态码的错误对象。
}
