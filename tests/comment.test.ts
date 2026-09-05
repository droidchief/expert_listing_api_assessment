import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTestUser, createTestPost, cleanupTestData, type TestUser, type TestPost } from './helpers/fixtures.js';

const app = createApp();

// Seed post with exactly 7 comments (one is a reply) — read-only use, safe against
// seed data per the Part 13 isolation rule.
const COMMENTED_POST_ID = '20000000-0000-0000-0000-000000000002';

let user: TestUser;
let post: TestPost;

beforeAll(async () => {
  user = await createTestUser('comment');
  post = await createTestPost(user.id, 'comment fixture');
});

afterAll(async () => {
  await cleanupTestData();
});

describe('GET /posts/:id/comments', () => {
  it('returns roots only, newest first by default', async () => {
    const res = await request(app).get(`/api/v1/posts/${COMMENTED_POST_ID}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) {
      expect(item.replies_preview).toBeDefined();
    }
    const timestamps = res.body.data.map((i: { created_at: string }) => i.created_at);
    for (let i = 1; i < timestamps.length; i++) {
      expect(new Date(timestamps[i]).getTime()).toBeLessThanOrEqual(
        new Date(timestamps[i - 1]).getTime(),
      );
    }
  });

  it('the sweep collects every root with no duplicates', async () => {
    const ids: string[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pages = 0;

    while (hasMore) {
      pages += 1;
      expect(pages).toBeLessThan(20);
      const query: Record<string, string> = { limit: '2' };
      if (cursor) query.cursor = cursor;
      const res = await request(app).get(`/api/v1/posts/${COMMENTED_POST_ID}/comments`).query(query);
      expect(res.status).toBe(200);
      for (const item of res.body.data) ids.push(item.id);
      hasMore = res.body.pagination.has_more;
      cursor = res.body.pagination.next_cursor;
    }

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('sort=oldest reverses the order', async () => {
    const res = await request(app)
      .get(`/api/v1/posts/${COMMENTED_POST_ID}/comments`)
      .query({ sort: 'oldest' });
    expect(res.status).toBe(200);
    const timestamps = res.body.data.map((i: { created_at: string }) => i.created_at);
    for (let i = 1; i < timestamps.length; i++) {
      expect(new Date(timestamps[i]).getTime()).toBeGreaterThanOrEqual(
        new Date(timestamps[i - 1]).getTime(),
      );
    }
  });

  it('a nonexistent post is 404, never an empty array', async () => {
    const res = await request(app).get(
      '/api/v1/posts/00000000-0000-0000-0000-000000000000/comments',
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('POST_NOT_FOUND');
  });
});

describe('POST /posts/:id/comments', () => {
  it('returns 201 with the full comment and post_comment_count', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('X-User-Id', user.id)
      .send({ body: '[TEST] is the parking secured?' });

    expect(res.status).toBe(201);
    expect(res.body.data.comment.id).toBeDefined();
    expect(res.body.data.comment.body).toBe('[TEST] is the parking secured?');
    expect(res.body.data.post_comment_count).toBe(1);
  });
});
