import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
const numberFormatter = new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1
});
export function VideoList({ items, onCopyLink }) {
    const now = useMemo(() => new Date(), [items]);
    if (items.length === 0) {
        return null;
    }
    return (_jsx("div", { className: "video-list", children: items.map((item) => (_jsxs("article", { className: "video-card", "data-platform": item.platform, children: [_jsxs("div", { className: "video-card__thumb", children: [renderThumbnail(item), _jsx("span", { className: "video-card__platform", "data-platform": item.platform, children: item.platform === 'youtube' ? 'YouTube' : 'Reddit' })] }), _jsxs("div", { className: "video-card__content", children: [_jsx("h3", { className: "video-card__title", children: _jsx("a", { href: item.url, target: "_blank", rel: "noreferrer", children: item.title }) }), _jsxs("div", { className: "video-card__meta", children: [item.platform === 'reddit' && item.labels?.[0] ? _jsxs("span", { children: ["r/", item.labels[0]] }) : null, _jsx("span", { children: item.platform === 'youtube' ? item.author || '未知频道' : `作者：${item.author || '未知用户'}` }), _jsxs("span", { children: [item.platform === 'youtube' ? '发布：' : '发布时间：', formatDate(item.publishedAt)] }), item.platform === 'youtube' ? (_jsxs("span", { children: ["\u89C2\u770B\u91CF\uFF1A", formatNumber(item.viewCount)] })) : (_jsxs("span", { children: ["\u5F97\u5206\uFF1A", formatNumber(item.score)] }))] }), _jsxs("div", { className: "video-card__footer", children: [_jsxs("span", { children: ["\u6293\u53D6\u65F6\u95F4\uFF1A", formatRelativeTime(item.fetchedAt, now), item.platform === 'reddit' && item.permalink ? ` · ${item.permalink}` : ''] }), _jsxs("div", { className: "video-card__actions", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: () => onCopyLink(item.url), children: "\u590D\u5236\u94FE\u63A5" }), _jsx("a", { href: item.url, target: "_blank", rel: "noreferrer", className: "primary-link", children: item.platform === 'youtube' ? '打开视频' : '打开帖子' })] })] })] })] }, `${item.platform}-${item.id}`))) }));
}
function renderThumbnail(item) {
    if (item.thumbnailUrl) {
        return _jsx("img", { src: item.thumbnailUrl, alt: item.title, loading: "lazy" });
    }
    if (item.platform === 'reddit' && item.labels?.[0]) {
        return _jsxs("div", { className: "video-card__thumb--placeholder", children: ["r/", item.labels[0]] });
    }
    return _jsx("div", { className: "video-card__thumb--placeholder", children: "\u6682\u65E0\u9884\u89C8" });
}
function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleString();
}
function formatNumber(value) {
    if (value == null || !Number.isFinite(value)) {
        return '-';
    }
    return numberFormatter.format(value);
}
function formatRelativeTime(value, now) {
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
