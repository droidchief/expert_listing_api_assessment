import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTestUser, createTestPost, cleanupTestData, type TestUser, type TestPost } from './helpers/fixtures.js';

const app = createApp();

let user: TestUser;
let post: TestPost;

beforeAll(async () => {
  user = await createTestUser('comment-idem');
  post = await createTestPost(user.id, 'comment idempotency fixture');
});

afterAll(async () => {
  await cleanupTestData();
});

describe('POST /posts/:id/comments idempotency', () => {
  it('a repeated client_token returns the same id and increments once', async () => {
    const token = 'tok-abc12345';

    const first = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('X-User-Id', user.id)
      .send({ body: '[TEST] double tap test', client_token: token });
    expect(first.status).toBe(201);
    expect(first.body.data.post_comment_count).toBe(1);

    const second = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('X-User-Id', user.id)
      .send({ body: '[TEST] double tap test', client_token: token });
    expect(second.status).toBe(201);
    expect(second.body.data.comment.id).toBe(first.body.data.comment.id);
    expect(second.body.data.post_comment_count).toBe(1); // no second increment
  });

  it('two concurrent identical tokens produce one comment and no 409', async () => {
    const token = 'tok-concurrent1';

    const [a, b] = await Promise.all([
      request(app)
        .post(`/api/v1/posts/${post.id}/comments`)
        .set('X-User-Id', user.id)
        .send({ body: '[TEST] concurrent token test', client_token: token }),
      request(app)
        .post(`/api/v1/posts/${post.id}/comments`)
        .set('X-User-Id', user.id)
        .send({ body: '[TEST] concurrent token test', client_token: token }),
    ]);

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.data.comment.id).toBe(b.body.data.comment.id);
  });
});
