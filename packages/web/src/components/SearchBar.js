import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import clsx from 'clsx';
export function SearchBar({ platform, onPlatformChange, defaultValue = '', loading = false, onSearch, history = [], onHistorySelect, onHistoryClear }) {
    const [keyword, setKeyword] = useState(defaultValue);
    useEffect(() => {
        setKeyword(defaultValue);
    }, [defaultValue]);
    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmed = keyword.trim();
        if (!trimmed) {
            return;
        }
        setKeyword(trimmed);
        onSearch(trimmed);
    };
    const handleHistoryClick = (value) => {
        setKeyword(value);
        onHistorySelect?.(value);
    };
    const handlePlatformClick = (nextPlatform) => {
        if (nextPlatform === platform || loading) {
            return;
        }
        onPlatformChange(nextPlatform);
    };
    return (_jsxs("form", { className: "search-bar", onSubmit: handleSubmit, children: [_jsxs("div", { className: "search-bar__platform", children: [_jsx("span", { className: "search-bar__platform-label", children: "\u5E73\u53F0" }), _jsx("div", { className: "platform-toggle", role: "radiogroup", "aria-label": "\u9009\u62E9\u5185\u5BB9\u6765\u6E90\u5E73\u53F0", children: ['youtube', 'reddit'].map((option) => (_jsx("button", { type: "button", className: clsx('platform-option', { active: option === platform }), role: "radio", "aria-checked": option === platform, onClick: () => handlePlatformClick(option), disabled: loading, children: option === 'youtube' ? 'YouTube' : 'Reddit' }, option))) })] }), _jsx("label", { className: "search-bar__label", htmlFor: "keyword", children: "\u4EA7\u54C1\u5173\u952E\u8BCD" }), _jsxs("div", { className: "search-bar__controls", children: [_jsx("input", { id: "keyword", className: "search-bar__input", placeholder: "\u4F8B\u5982\uFF1AApple Vision Pro", value: keyword, onChange: (event) => setKeyword(event.target.value), disabled: loading }), _jsx("button", { type: "submit", className: clsx('search-bar__button', { 'is-loading': loading }), disabled: loading || !keyword.trim(), children: loading ? '检索中...' : '搜索' })] }), history.length > 0 ? (_jsxs("div", { className: "search-bar__history", children: [_jsxs("div", { className: "search-bar__history-header", children: [_jsx("span", { children: "\u5386\u53F2\u67E5\u8BE2" }), _jsx("button", { type: "button", className: "text-button", onClick: onHistoryClear, disabled: loading, children: "\u6E05\u7A7A" })] }), _jsx("div", { className: "search-bar__history-list", children: history.map((item) => (_jsx("button", { type: "button", className: "history-chip", onClick: () => handleHistoryClick(item), disabled: loading, children: item }, item))) })] })) : null] }));
}
