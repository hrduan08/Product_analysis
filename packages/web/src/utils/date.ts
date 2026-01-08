const DAY_MS = 24 * 60 * 60 * 1000;

type Lang = 'zh' | 'en';

export function formatRunTime(value: string, lang: Lang = 'zh'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const now = new Date();
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const sameDay = now.toDateString() === date.toDateString();
  if (sameDay) {
    return lang === 'zh'
      ? `今天 ${date.toLocaleTimeString('zh-CN', timeOptions)}`
      : `Today ${date.toLocaleTimeString(undefined, timeOptions)}`;
  }
  const yesterday = new Date(now.getTime() - DAY_MS);
  if (yesterday.toDateString() === date.toDateString()) {
    return lang === 'zh'
      ? `昨天 ${date.toLocaleTimeString('zh-CN', timeOptions)}`
      : `Yesterday ${date.toLocaleTimeString(undefined, timeOptions)}`;
  }
  return date.toLocaleString(lang === 'zh' ? 'zh-CN' : undefined, {
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

export function formatMonthLabel(key: string, lang: Lang = 'zh'): string {
  const [year, month = '01'] = key.split('-');
  if (lang === 'zh') {
    return `${year} 年 ${Number(month)} 月`;
  }
  const monthNum = Number(month);
  const monthName = new Date(Number(year), monthNum - 1, 1).toLocaleString('en-US', { month: 'long' });
  return `${monthName} ${year}`;
}
