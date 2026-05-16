export type Platform = 'youtube' | 'reddit';

export type SearchParams = {
  query: string;
  cursor?: string;
  limit?: number;
  subreddit?: string;
  relevanceLanguage?: string;
  regionCode?: string;
  order?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  maxPages?: number;
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
};

export type FeedbackItem = {
  platform: Platform;
  keyword: string;
  id: string;
  title: string;
  author: string;
  publishedAt: string;
  fetchedAt: string;
  url: string;
  permalink?: string | null;
  thumbnailUrl?: string | null;
  viewCount?: number | null;
  score?: number | null;
  commentCount?: number | null;
  description?: string | null;
  tags?: string[];
  matchLevel?: string | null;
  labels?: string[];
  matchedKeywords?: string[];
};

export type SearchResult = {
  items: FeedbackItem[];
  pageInfo: {
    totalResults?: number;
    resultsPerPage?: number;
    nextCursor?: string | null;
    prevCursor?: string | null;
    raw?: Record<string, unknown>;
  };
};

export interface SearchProvider {
  search(params: SearchParams): Promise<SearchResult>;
}
