import { FormEvent, useEffect, useState } from 'react';
import clsx from 'clsx';

import type { Platform } from '../types/feedback';

type SearchBarProps = {
  platform: Platform;
  onPlatformChange: (platform: Platform) => void;
  defaultValue?: string;
  loading?: boolean;
  onSearch: (keyword: string) => void;
  history?: string[];
  onHistorySelect?: (keyword: string) => void;
  onHistoryClear?: () => void;
};

export function SearchBar({
  platform,
  onPlatformChange,
  defaultValue = '',
  loading = false,
  onSearch,
  history = [],
  onHistorySelect,
  onHistoryClear
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(defaultValue);

  useEffect(() => {
    setKeyword(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) {
      return;
    }
    setKeyword(trimmed);
    onSearch(trimmed);
  };

  const handleHistoryClick = (value: string) => {
    setKeyword(value);
    onHistorySelect?.(value);
  };

  const handlePlatformClick = (nextPlatform: Platform) => {
    if (nextPlatform === platform || loading) {
      return;
    }
    onPlatformChange(nextPlatform);
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-bar__platform">
        <span className="search-bar__platform-label">平台</span>
        <div className="platform-toggle" role="radiogroup" aria-label="选择内容来源平台">
          {(['youtube', 'reddit'] as Platform[]).map((option) => (
            <button
              key={option}
              type="button"
              className={clsx('platform-option', { active: option === platform })}
              role="radio"
              aria-checked={option === platform}
              onClick={() => handlePlatformClick(option)}
              disabled={loading}
            >
              {option === 'youtube' ? 'YouTube' : 'Reddit'}
            </button>
          ))}
        </div>
      </div>
      <label className="search-bar__label" htmlFor="keyword">
        产品关键词
      </label>
      <div className="search-bar__controls">
        <input
          id="keyword"
          className="search-bar__input"
          placeholder="例如：Apple Vision Pro"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className={clsx('search-bar__button', { 'is-loading': loading })}
          disabled={loading || !keyword.trim()}
        >
          {loading ? '检索中...' : '搜索'}
        </button>
      </div>

      {history.length > 0 ? (
        <div className="search-bar__history">
          <div className="search-bar__history-header">
            <span>历史查询</span>
            <button
              type="button"
              className="text-button"
              onClick={onHistoryClear}
              disabled={loading}
            >
              清空
            </button>
          </div>
          <div className="search-bar__history-list">
            {history.map((item) => (
              <button
                key={item}
                type="button"
                className="history-chip"
                onClick={() => handleHistoryClick(item)}
                disabled={loading}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
