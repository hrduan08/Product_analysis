import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../db/prisma.js';
import type { FeedbackItem, Platform } from '../types/search.js';

type PersistResult = {
  processed: number;
  created: number;
  updated: number;
};

export type FeedbackEntity = Prisma.FeedbackItemGetPayload<{
  select: {
    id: true;
    platform: true;
    external_id: true;
    keyword: true;
    title: true;
    author: true;
    url: true;
    thumbnail_url: true;
    permalink: true;
    published_at: true;
    first_seen_at: true;
    last_seen_at: true;
    view_count: true;
    score: true;
    comment_count: true;
    metadata: true;
  };
}>;

export async function upsertFeedbackItems(
  platform: Platform,
  keyword: string,
  items: FeedbackItem[]
): Promise<PersistResult> {
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const exists = await prisma.feedbackItem.findUnique({
      where: { platform_external_id: { platform, external_id: item.id } },
      select: { id: true }
    });

    const seenAt = parseDate(item.fetchedAt) ?? new Date();
    const publishedAt = parseDate(item.publishedAt);
    const metadata = buildMetadata(item);

    await prisma.feedbackItem.upsert({
      where: { platform_external_id: { platform, external_id: item.id } },
      create: {
        platform,
        external_id: item.id,
        keyword,
        title: item.title,
        author: item.author ?? null,
        url: item.url,
        thumbnail_url: item.thumbnailUrl ?? null,
        permalink: item.permalink ?? null,
        published_at: publishedAt,
        first_seen_at: seenAt,
        last_seen_at: seenAt,
        view_count: item.viewCount ?? null,
        score: item.score ?? null,
        comment_count: item.commentCount ?? null,
        metadata: metadata ?? Prisma.DbNull
      },
      update: {
        keyword,
        title: item.title,
        author: item.author ?? null,
        url: item.url,
        thumbnail_url: item.thumbnailUrl ?? null,
        permalink: item.permalink ?? null,
        published_at: publishedAt,
        last_seen_at: seenAt,
        view_count: item.viewCount ?? null,
        score: item.score ?? null,
        comment_count: item.commentCount ?? null,
        metadata: metadata ?? Prisma.DbNull
      }
    });

    if (exists) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return {
    processed: items.length,
    created,
    updated
  };
}

type NewItemsFilter = {
  platforms?: Platform[];
  keywords?: string[];
};

export async function getNewFeedbackItemsSince(
  since: Date,
  filter?: NewItemsFilter
): Promise<FeedbackEntity[]> {
  const where: Prisma.FeedbackItemWhereInput = {
    first_seen_at: { gt: since }
  };

  if (filter?.platforms?.length) {
    where.platform = { in: filter.platforms };
  }

  if (filter?.keywords?.length) {
    where.keyword = { in: filter.keywords };
  }

  return prisma.feedbackItem.findMany({
    where,
    orderBy: {
      first_seen_at: 'desc'
    }
  });
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildMetadata(item: FeedbackItem): Prisma.JsonObject | null {
  const metadata: Prisma.JsonObject = {};

  if (item.thumbnailUrl) {
    metadata.thumbnailUrl = item.thumbnailUrl;
  }
  if (item.labels && item.labels.length > 0) {
    metadata.labels = item.labels;
  }
  if (item.fetchedAt) {
    metadata.fetchedAt = item.fetchedAt;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}
