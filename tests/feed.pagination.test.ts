import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sql } from '../src/config/db.js';

const app = createApp();

// limit=7 is deliberate, not arbitrary: seed created_at values were bulk-inserted and
// several rows tie on the exact microsecond (Part 9's driver bug). Page boundaries at
// 7 land on those ties, so this is the size that would expose a keyset regression.
const PAGE_SIZE = 7;

describe('GET /posts pagination (full seed sweep)', () => {
  it('pages the full seed set into distinct ids with non-increasing timestamps', async () => {
    const [{ count: expectedTotal }] = await sql<[{ count: number }]>`
      SELECT count(*)::int AS count
      FROM posts
      WHERE deleted_at IS NULL AND status = 'active' AND visibility = 'public'
    `;

    const ids: string[] = [];
    const timestamps: string[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let nextCursor: string | null = null;
    let pages = 0;

    while (hasMore) {
      pages += 1;
      expect(pages).toBeLessThan(20); // guards against an infinite-loop regression

      const query: Record<string, string> = { limit: String(PAGE_SIZE) };
      if (cursor) query.cursor = cursor;

      const res = await request(app).get('/api/v1/posts').query(query);
      expect(res.status).toBe(200);

      for (const item of res.body.data) {
        ids.push(item.id);
        timestamps.push(item.created_at);
      }

      hasMore = res.body.pagination.has_more;
      nextCursor = res.body.pagination.next_cursor;
      cursor = nextCursor;
    }

    const distinct = new Set(ids);
    expect(distinct.size).toBe(ids.length); // no duplicates across pages
    expect(distinct.size).toBe(expectedTotal); // every seed row was seen exactly once

    for (let i = 1; i < timestamps.length; i++) {
      expect(new Date(timestamps[i]!).getTime()).toBeLessThanOrEqual(
        new Date(timestamps[i - 1]!).getTime(),
      );
    }

    expect(hasMore).toBe(false);
    expect(nextCursor).toBeNull();
  });
});
