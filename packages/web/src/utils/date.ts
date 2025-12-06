const DAY_MS = 24 * 60 * 60 * 1000;

export function formatRunTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const now = new Date();
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const sameDay = now.toDateString() === date.toDateString();
  if (sameDay) {
    return `今天 ${date.toLocaleTimeString('zh-CN', timeOptions)}`;
  }
  const yesterday = new Date(now.getTime() - DAY_MS);
  if (yesterday.toDateString() === date.toDateString()) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', timeOptions)}`;
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function monthKeyFromDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function formatMonthLabel(key: string): string {
  const [year, month = '01'] = key.split('-');
  return `${year} 年 ${Number(month)} 月`;
}
