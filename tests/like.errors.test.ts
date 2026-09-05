import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTestUser, createTestPost, cleanupTestData, type TestUser, type TestPost } from './helpers/fixtures.js';

const app = createApp();

let user: TestUser;
let post: TestPost;

beforeAll(async () => {
  user = await createTestUser('like-errors');
  post = await createTestPost(user.id, 'like errors fixture');
});

afterAll(async () => {
  await cleanupTestData();
});

describe('POST /posts/:id/like errors', () => {
  it('nonexistent post is 404 POST_NOT_FOUND', async () => {
    const res = await request(app)
      .post('/api/v1/posts/00000000-0000-0000-0000-000000000000/like')
      .set('X-User-Id', user.id);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('POST_NOT_FOUND');
  });

  it('malformed uuid is 400, never 404 or 500', async () => {
    const res = await request(app).post('/api/v1/posts/not-a-uuid/like').set('X-User-Id', user.id);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('unknown body key is 400 (schema is .strict())', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id)
      .send({ like: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('an invalid action value is 400 with field_errors', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('X-User-Id', user.id)
      .send({ action: 'unliked' });
    expect(res.status).toBe(400);
    expect(res.body.error.field_errors).toBeDefined();
  });
});
