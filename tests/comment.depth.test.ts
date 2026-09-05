import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTestUser, createTestPost, cleanupTestData, type TestUser, type TestPost } from './helpers/fixtures.js';

const app = createApp();

let user: TestUser;
let post: TestPost;
let otherPost: TestPost;
let rootCommentId: string;
let replyCommentId: string;

beforeAll(async () => {
  user = await createTestUser('comment-depth');
  post = await createTestPost(user.id, 'comment depth fixture');
  otherPost = await createTestPost(user.id, 'comment depth other post');

  const root = await request(app)
    .post(`/api/v1/posts/${post.id}/comments`)
    .set('X-User-Id', user.id)
    .send({ body: '[TEST] root comment' });
  rootCommentId = root.body.data.comment.id;

  const reply = await request(app)
    .post(`/api/v1/posts/${post.id}/comments`)
    .set('X-User-Id', user.id)
    .send({ body: '[TEST] a reply', parent_comment_id: rootCommentId });
  replyCommentId = reply.body.data.comment.id;
});

afterAll(async () => {
  await cleanupTestData();
});

describe('POST /posts/:id/comments reply depth', () => {
  it('a valid reply lands in replies_preview when the thread is fetched', async () => {
    const res = await request(app).get(`/api/v1/posts/${post.id}/comments`);
    expect(res.status).toBe(200);
    const rootItem = res.body.data.find((c: { id: string }) => c.id === rootCommentId);
    expect(rootItem).toBeDefined();
    expect(rootItem.replies_preview.some((r: { id: string }) => r.id === replyCommentId)).toBe(
      true,
    );
  });

  it('reply-to-a-reply is 409 MAX_REPLY_DEPTH, never 500', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('X-User-Id', user.id)
      .send({ body: '[TEST] grandchild', parent_comment_id: replyCommentId });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MAX_REPLY_DEPTH');
  });

  it('a parent from a different post is 400 with field parent_comment_id', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${otherPost.id}/comments`)
      .set('X-User-Id', user.id)
      .send({ body: '[TEST] wrong post', parent_comment_id: rootCommentId });
    expect(res.status).toBe(400);
    expect(res.body.error.field_errors?.[0]?.field).toBe('parent_comment_id');
  });

  it('a nonexistent parent is 404 PARENT_COMMENT_NOT_FOUND', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('X-User-Id', user.id)
      .send({ body: '[TEST] x', parent_comment_id: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PARENT_COMMENT_NOT_FOUND');
  });
});
