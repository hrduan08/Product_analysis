export function getEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`环境变量 ${key} 未设置`);
  }

  return value;
}
