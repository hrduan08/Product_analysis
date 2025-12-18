export type Platform = 'youtube' | 'reddit';

export type SearchParams = {
  query: string;
  cursor?: string;
  limit?: number;
  relevanceLanguage?: string;
  regionCode?: string;
  order?: string;
  publishedAfter?: string;
  maxPages?: number;
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
