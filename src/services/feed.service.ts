import type { FeedQuery } from '../schemas/feed.schema.js';
import { selectFeed, type FeedRow } from '../repositories/posts.repo.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import { mapPostRow, type PostDto } from '../mappers/post.mapper.js';

const POSTED_WITHIN_MS: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export interface FeedResult {
  items: PostDto[];
  hasMore: boolean;
  nextCursor: string | null;
}

export async function getFeed(query: FeedQuery, viewerId: string): Promise<FeedResult> {
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;

  const postedAfter = query.posted_within
    ? new Date(Date.now() - POSTED_WITHIN_MS[query.posted_within]!)
    : null;

  // Ask for one extra row so we can tell whether there's a next page, without ever
  // adding a second +1 anywhere else — get_feed applies LIMIT literally.
  const rows = await selectFeed({
    viewerId,
    limit: query.limit + 1,
    cursorTs: cursor?.ts ?? null,
    cursorId: cursor?.id ?? null,
    postTypes: query.post_type ?? null,
    transactionTypes: query.transaction_type ?? null,
    locationIds: query.location_id ?? null,
    minPrice: query.min_price ?? null,
    maxPrice: query.max_price ?? null,
    minBedrooms: query.min_bedrooms ?? null,
    hasMedia: query.has_media ?? null,
    postedAfter,
  });

  const hasMore = rows.length > query.limit;
  const page: FeedRow[] = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page[page.length - 1];

  const nextCursor =
    hasMore && last ? encodeCursor({ ts: last.created_at_iso, id: last.id }) : null;

  return {
    items: page.map((row) => mapPostRow(row, viewerId)),
    hasMore,
    nextCursor,
  };
}
