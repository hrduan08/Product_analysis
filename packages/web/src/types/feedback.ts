export type Platform = 'youtube' | 'reddit';

export type PageInfo = {
  totalResults?: number;
  resultsPerPage?: number;
  nextCursor?: string | null;
  prevCursor?: string | null;
  raw?: Record<string, unknown> | null;
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
  labels?: string[];
};

export type SearchResponse = {
  platform: Platform;
  keyword: string;
  items: FeedbackItem[];
  pageInfo: PageInfo;
};
