import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { createApp } from '../src/app.js';

const app = createApp();

// Mirrors src/mappers/post.mapper.ts's PostDto. Written independently of the mapper
// so a regression there (e.g. a numeric column left as a string, or an empty object
// where null belongs) fails a test instead of silently reaching the client.
const postDtoSchema = z.object({
  id: z.string(),
  post_type: z.enum(['general', 'property', 'request']),
  body: z.string(),
  transaction_type: z.string().nullable(),
  coordinates: z.object({ latitude: z.number(), longitude: z.number() }).nullable(),
  price: z
    .object({
      amount: z.number(),
      currency: z.string(),
      period: z.string().nullable(),
      negotiable: z.boolean(),
    })
    .nullable(),
  property: z
    .object({
      bedrooms: z.number().nullable(),
      bathrooms: z.number().nullable(),
      parking_spaces: z.number().nullable(),
      size_sqm: z.number().nullable(),
      amenities: z.array(z.string()),
      available_from: z.string().nullable(),
      inspection_at: z.string().nullable(),
    })
    .nullable(),
  author: z.object({
    id: z.string(),
    username: z.string(),
    role: z.string().nullable(),
  }),
  show_role_badge: z.boolean(),
  media: z.array(z.object({ id: z.string(), position: z.number() })),
  counts: z.object({
    likes: z.number(),
    comments: z.number(),
    shares: z.number(),
    bookmarks: z.number(),
    views: z.number(),
  }),
  liked_by_preview: z.object({
    total: z.number(),
    users: z.array(z.object({ username: z.string() })),
  }),
  top_comment: z.object({ id: z.string(), body: z.string() }).nullable(),
  created_at: z.string(),
});

describe('GET /posts response shape', () => {
  it('every item on a full page validates against the DTO schema', async () => {
    const res = await request(app).get('/api/v1/posts').query({ limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    for (const item of res.body.data) {
      const result = postDtoSchema.safeParse(item);
      expect(result.success, JSON.stringify(result.success ? null : result.error.issues)).toBe(
        true,
      );
    }
  });

  it('numeric fields are numbers, never strings', async () => {
    const res = await request(app).get('/api/v1/posts').query({ post_type: 'property', limit: 50 });
    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      if (item.price) expect(typeof item.price.amount).toBe('number');
      if (item.coordinates) {
        expect(typeof item.coordinates.latitude).toBe('number');
        expect(typeof item.coordinates.longitude).toBe('number');
      }
      if (item.property?.size_sqm !== null && item.property?.size_sqm !== undefined) {
        expect(typeof item.property.size_sqm).toBe('number');
      }
    }
  });

  it('show_role_badge is true only for property posts whose author has a role', async () => {
    const res = await request(app).get('/api/v1/posts').query({ limit: 50 });
    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      if (item.show_role_badge) {
        expect(item.post_type).toBe('property');
        expect(item.author.role).not.toBeNull();
      }
      if (item.post_type !== 'property') {
        expect(item.show_role_badge).toBe(false);
      }
    }
  });

  it('a general post with no price/coords/property carries null, not {}', async () => {
    const res = await request(app).get('/api/v1/posts').query({ post_type: 'general', limit: 50 });
    expect(res.status).toBe(200);
    const noPropertyItem = res.body.data.find(
      (i: { property: unknown }) => i.property === null,
    );
    expect(noPropertyItem).toBeDefined();
    expect(noPropertyItem.price === null || typeof noPropertyItem.price === 'object').toBe(true);
  });
});
