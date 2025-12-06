import { useMemo } from 'react';

import type { FeedbackItem } from '../types/feedback';

type VideoListProps = {
  items: FeedbackItem[];
  onCopyLink: (url: string) => void;
};

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1
});

export function VideoList({ items, onCopyLink }: VideoListProps) {
  const now = useMemo(() => new Date(), [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="video-list">
      {items.map((item) => (
        <article key={`${item.platform}-${item.id}`} className="video-card" data-platform={item.platform}>
          <div className="video-card__thumb">
            {renderThumbnail(item)}
            <span className="video-card__platform" data-platform={item.platform}>
              {item.platform === 'youtube' ? 'YouTube' : 'Reddit'}
            </span>
          </div>
          <div className="video-card__content">
            <h3 className="video-card__title">
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </h3>
            <div className="video-card__meta">
              {item.platform === 'reddit' && item.labels?.[0] ? <span>r/{item.labels[0]}</span> : null}
              <span>{item.platform === 'youtube' ? item.author || '未知频道' : `作者：${item.author || '未知用户'}`}</span>
              <span>{item.platform === 'youtube' ? '发布：' : '发布时间：'}{formatDate(item.publishedAt)}</span>
              {item.platform === 'youtube' ? (
                <span>观看量：{formatNumber(item.viewCount)}</span>
              ) : (
                <span>得分：{formatNumber(item.score)}</span>
              )}
            </div>
            <div className="video-card__footer">
              <span>
                抓取时间：{formatRelativeTime(item.fetchedAt, now)}
                {item.platform === 'reddit' && item.permalink ? ` · ${item.permalink}` : ''}
              </span>
              <div className="video-card__actions">
                <button type="button" className="ghost-button" onClick={() => onCopyLink(item.url)}>
                  复制链接
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="primary-link"
                >
                  {item.platform === 'youtube' ? '打开视频' : '打开帖子'}
                </a>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function renderThumbnail(item: FeedbackItem) {
  if (item.thumbnailUrl) {
    return <img src={item.thumbnailUrl} alt={item.title} loading="lazy" />;
  }
  if (item.platform === 'reddit' && item.labels?.[0]) {
    return <div className="video-card__thumb--placeholder">r/{item.labels[0]}</div>;
  }
  return <div className="video-card__thumb--placeholder">暂无预览</div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString();
}
function formatNumber(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }
  return numberFormatter.format(value);
}
function formatRelativeTime(value: string, now: Date) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) {
    return value;
  }

  const diff = now.getTime() - time.getTime();
  const minutes = Math.round(diff / (1000 * 60));

  if (minutes < 1) {
    return '刚刚';
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }
  const days = Math.round(hours / 24);
  return `${days} 天前`;
}
