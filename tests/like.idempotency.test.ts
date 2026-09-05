import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTestUser, createTestPost, cleanupTestData, type TestUser, type TestPost } from './helpers/fixtures.js';

const app = createApp();

let user: TestUser;
let post: TestPost;

beforeAll(async () => {
  user = await createTestUser('like-idem');
  post = await createTestPost(user.id, 'like idempotency fixture');
});

afterAll(async () => {
  await cleanupTestData();
});

describe('POST /posts/:id/like idempotency', () => {
  it('repeated {"action":"like"} gives an identical body and a single increment', async () => {
    const first = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id)
      .send({ action: 'like' });
    expect(first.status).toBe(200);
    expect(first.body.data.has_liked).toBe(true);
    expect(first.body.data.like_count).toBe(1);

    const second = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id)
      .send({ action: 'like' });
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual(first.body.data);
  });

  it('repeated {"action":"unlike"} gives an identical body and a single decrement', async () => {
    const first = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id)
      .send({ action: 'unlike' });
    expect(first.status).toBe(200);
    expect(first.body.data.has_liked).toBe(false);
    expect(first.body.data.like_count).toBe(0);

    const second = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id)
      .send({ action: 'unlike' });
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual(first.body.data);
  });

  it('10 concurrent likes leave the count at exactly +1', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/v1/posts/${post.id}/like`)
          .set('X-User-Id', user.id)
          .send({ action: 'like' }),
      ),
    );
    for (const res of results) expect(res.status).toBe(200);

    const final = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id)
      .send({ action: 'like' });
    expect(final.body.data.like_count).toBe(1);

    // Reset for the next test.
    await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id)
      .send({ action: 'unlike' });
  });

  it('a bare POST (no body) toggles whatever the current state is', async () => {
    const before = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id)
      .send({ action: 'unlike' }); // ensure known starting state: unliked
    expect(before.body.data.has_liked).toBe(false);

    const toggled = await request(app).post(`/api/v1/posts/${post.id}/like`).set('X-User-Id', user.id);
    expect(toggled.status).toBe(200);
    expect(toggled.body.data.has_liked).toBe(true);

    const toggledBack = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id);
    expect(toggledBack.body.data.has_liked).toBe(false);
  });
});
