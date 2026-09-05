import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { requestId } from '../src/middleware/requestId.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { notFound } from '../src/middleware/notFound.js';
import { createTestUser, createTestPost, cleanupTestData, type TestUser, type TestPost } from './helpers/fixtures.js';

const app = createApp();

// A minimal harness sharing the real requestId/errorHandler middleware, with one
// route that throws a plain (non-AppError) Error — this is the only way to observe
// a genuine 500 without deliberately breaking a real endpoint.
const crashApp = express();
crashApp.use(requestId);
crashApp.get('/crash', () => {
  throw new Error('SELECT * FROM users WHERE id = 1 -- pretend this leaked from a driver');
});
crashApp.use(notFound);
crashApp.use(errorHandler);

function assertEnvelopeShape(body: unknown, status: number) {
  const err = (body as { error: Record<string, unknown> }).error;
  const meta = (body as { meta: Record<string, unknown> }).meta;
  expect(typeof err.code).toBe('string');
  expect(typeof err.message).toBe('string');
  expect(typeof err.retryable).toBe('boolean');
  expect(err.retryable).toBe(status >= 500);
  expect(typeof meta.request_id).toBe('string');

  const raw = JSON.stringify(body);
  expect(raw).not.toMatch(/stack/i);
  expect(raw).not.toMatch(/SELECT/i);
  expect(raw).not.toMatch(/\bFROM\s+\w+/i);
  expect(raw).not.toMatch(/\busers\b|\bposts\b|\bcomments\b/i);
}

let user: TestUser;
let post: TestPost;

beforeAll(async () => {
  user = await createTestUser('errenv');
  post = await createTestPost(user.id, 'errors envelope fixture');
});

afterAll(async () => {
  await cleanupTestData();
});

describe('error envelope shape', () => {
  it('400 VALIDATION_ERROR (unknown query param)', async () => {
    const res = await request(app).get('/api/v1/posts').query({ unknown: 'x' });
    expect(res.status).toBe(400);
    assertEnvelopeShape(res.body, 400);
  });

  it('400 INVALID_CURSOR (malformed cursor)', async () => {
    const res = await request(app).get('/api/v1/posts').query({ cursor: 'garbage' });
    expect(res.status).toBe(400);
    assertEnvelopeShape(res.body, 400);
  });

  it('404 ROUTE_NOT_FOUND (unknown route)', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    assertEnvelopeShape(res.body, 404);
  });

  it('404 POST_NOT_FOUND (like on a nonexistent post)', async () => {
    const res = await request(app).post(
      '/api/v1/posts/00000000-0000-0000-0000-000000000000/like',
    );
    expect(res.status).toBe(404);
    assertEnvelopeShape(res.body, 404);
  });

  it('409 MAX_REPLY_DEPTH (reply to a reply)', async () => {
    const root = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('X-User-Id', user.id)
      .send({ body: '[TEST] root' });
    const reply = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('X-User-Id', user.id)
      .send({ body: '[TEST] reply', parent_comment_id: root.body.data.comment.id });

    const res = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('X-User-Id', user.id)
      .send({ body: '[TEST] grandchild', parent_comment_id: reply.body.data.comment.id });
    expect(res.status).toBe(409);
    assertEnvelopeShape(res.body, 409);
  });

  it('500 INTERNAL_ERROR never leaks a stack trace, SQL, or table name', async () => {
    const res = await request(crashApp).get('/crash');
    expect(res.status).toBe(500);
    assertEnvelopeShape(res.body, 500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
