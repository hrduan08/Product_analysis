import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../db/prisma.js';
import type { FeedbackItem, Platform } from '../types/search.js';

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

export type PersistResult = {
  processed: number;
  created: number;
  updated: number;
  createdIds: string[];
  processedItems: Array<{ id: string; seenAt: Date }>;
};

export async function upsertFeedbackItems(
  platform: Platform,
  keyword: string,
  items: FeedbackItem[]
): Promise<PersistResult> {
  let created = 0;
  let updated = 0;
  const createdIds: string[] = [];
  const processedItems: Array<{ id: string; seenAt: Date }> = [];

  for (const item of items) {
    const exists = await prisma.feedbackItem.findUnique({
      where: { platform_external_id: { platform, external_id: item.id } },
      select: { id: true }
    });

    const seenAt = parseDate(item.fetchedAt) ?? new Date();
    const publishedAt = parseDate(item.publishedAt);
    const metadata = buildMetadata(item);

    const record = await prisma.feedbackItem.upsert({
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
      },
      select: { id: true }
    });

    processedItems.push({ id: record.id, seenAt });

    if (exists) {
      updated += 1;
    } else {
      created += 1;
      createdIds.push(record.id);
    }
  }

  return {
    processed: items.length,
    created,
    updated,
    createdIds,
    processedItems
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

export async function upsertUserFeedbackItems(
  userId: string,
  items: Array<{ feedbackItemId: string; seenAt: Date }>
): Promise<{ created: number; updated: number; createdIds: string[]; processedIds: string[] }> {
  let created = 0;
  let updated = 0;
  const createdIds: string[] = [];
  const processedIds: string[] = [];

  for (const entry of items) {
    const exists = await prisma.userFeedbackItem.findUnique({
      where: { user_id_feedback_item_id: { user_id: userId, feedback_item_id: entry.feedbackItemId } },
      select: { feedback_item_id: true }
    });

    await prisma.userFeedbackItem.upsert({
      where: { user_id_feedback_item_id: { user_id: userId, feedback_item_id: entry.feedbackItemId } },
      create: {
        user_id: userId,
        feedback_item_id: entry.feedbackItemId,
        first_seen_at: entry.seenAt,
        last_seen_at: entry.seenAt
      },
      update: {
        last_seen_at: entry.seenAt
      }
    });

    processedIds.push(entry.feedbackItemId);

    if (exists) {
      updated += 1;
    } else {
      created += 1;
      createdIds.push(entry.feedbackItemId);
    }
  }

  return { created, updated, createdIds, processedIds };
}

export async function getFeedbackItemsByIds(ids: string[]): Promise<FeedbackEntity[]> {
  if (ids.length === 0) return [];
  return prisma.feedbackItem.findMany({
    where: { id: { in: ids } },
    orderBy: { first_seen_at: 'desc' }
  });
}

export type UserFeedbackWithItem = {
  feedback_item_id: string;
  last_notified_at: Date | null;
  feedback: FeedbackEntity;
};

export async function getUserFeedbackItemsByIds(
  userId: string,
  feedbackItemIds: string[]
): Promise<UserFeedbackWithItem[]> {
  if (feedbackItemIds.length === 0) return [];
  const records = await prisma.userFeedbackItem.findMany({
    where: {
      user_id: userId,
      feedback_item_id: { in: feedbackItemIds }
    },
    include: {
      feedbackItem: {
        select: {
          id: true,
          platform: true,
          external_id: true,
          keyword: true,
          title: true,
          author: true,
          url: true,
          thumbnail_url: true,
          permalink: true,
          published_at: true,
          first_seen_at: true,
          last_seen_at: true,
          view_count: true,
          score: true,
          comment_count: true,
          metadata: true
        }
      }
    }
  });

  return records.map((record) => ({
    feedback_item_id: record.feedback_item_id,
    last_notified_at: record.last_notified_at ?? null,
    feedback: record.feedbackItem as FeedbackEntity
  }));
}

export async function markUserFeedbackItemsNotified(userId: string, feedbackItemIds: string[]): Promise<void> {
  if (feedbackItemIds.length === 0) return;
  await prisma.userFeedbackItem.updateMany({
    where: {
      user_id: userId,
      feedback_item_id: { in: feedbackItemIds }
    },
    data: {
      last_notified_at: new Date()
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
  if (item.matchLevel) {
    metadata.matchLevel = item.matchLevel;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}
