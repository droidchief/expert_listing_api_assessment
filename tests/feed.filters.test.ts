import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /posts filters', () => {
  it('post_type narrows to only that type', async () => {
    const res = await request(app).get('/api/v1/posts').query({ post_type: 'property', limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) expect(item.post_type).toBe('property');
  });

  it('transaction_type narrows to only that transaction', async () => {
    const res = await request(app)
      .get('/api/v1/posts')
      .query({ transaction_type: 'for_rent', limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) expect(item.transaction_type).toBe('for_rent');
  });

  it('has_media=true returns only posts with media', async () => {
    const res = await request(app).get('/api/v1/posts').query({ has_media: 'true', limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) expect(item.media.length).toBeGreaterThan(0);
  });

  it('has_media=false returns only posts without media', async () => {
    const res = await request(app).get('/api/v1/posts').query({ has_media: 'false', limit: 50 });
    expect(res.status).toBe(200);
    for (const item of res.body.data) expect(item.media.length).toBe(0);
  });

  it('min_bedrooms narrows to posts meeting the floor', async () => {
    const res = await request(app).get('/api/v1/posts').query({ min_bedrooms: 3, limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) {
      expect(item.property?.bedrooms).toBeGreaterThanOrEqual(3);
    }
  });

  it('two filters combine with AND', async () => {
    const res = await request(app)
      .get('/api/v1/posts')
      .query({ post_type: 'property', transaction_type: 'for_rent', limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) {
      expect(item.post_type).toBe('property');
      expect(item.transaction_type).toBe('for_rent');
    }
  });

  it('a filter persists across a cursor page', async () => {
    const first = await request(app)
      .get('/api/v1/posts')
      .query({ post_type: 'property', limit: 2 });
    expect(first.status).toBe(200);
    expect(first.body.pagination.has_more).toBe(true);

    const second = await request(app).get('/api/v1/posts').query({
      post_type: 'property',
      limit: 2,
      cursor: first.body.pagination.next_cursor,
    });
    expect(second.status).toBe(200);

    const firstIds = new Set(first.body.data.map((i: { id: string }) => i.id));
    for (const item of second.body.data) {
      expect(item.post_type).toBe('property');
      expect(firstIds.has(item.id)).toBe(false); // no repeat across the boundary
    }
  });

  it('unknown query param is 400 (schema is .strict())', async () => {
    const res = await request(app).get('/api/v1/posts').query({ unknown: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('limit=999 clamps to 50', async () => {
    const res = await request(app).get('/api/v1/posts').query({ limit: 999 });
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(50);
  });

  it('limit=0 is 400', async () => {
    const res = await request(app).get('/api/v1/posts').query({ limit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
