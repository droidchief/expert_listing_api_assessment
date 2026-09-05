import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sql } from '../src/config/db.js';
import { cleanupTestData } from './helpers/fixtures.js';

const app = createApp();

// None of these bodies should ever reach the database — asserting field_errors is
// present proves zod's superRefine caught it, not a Postgres CHECK constraint (which
// would surface as a 409/400 with no field_errors, via pgErrorMap).
// Body text is tagged with this file's own marker (not just the shared [TEST] prefix
// every fixture uses) so the orphan check below only ever looks at rows this file
// could plausibly have created — other test files run concurrently and have their
// own live [TEST] posts at the same moment, so a bare `LIKE '[TEST]%'` count would
// be racy.
const MARKER = '[TEST] post-constraints:';

const INVALID_BODIES = [
  {
    name: 'general post carrying a transaction_type',
    body: { post_type: 'general', body: `${MARKER} x`, transaction_type: 'for_sale' },
    field: 'transaction_type',
  },
  {
    name: 'property post missing a required transaction_type',
    body: { post_type: 'property', body: `${MARKER} x` },
  },
  {
    name: 'unpaired coordinates',
    body: { post_type: 'general', body: `${MARKER} x`, latitude: 6.45 },
  },
  {
    name: 'video media without duration',
    body: {
      post_type: 'general',
      body: `${MARKER} x`,
      media: [{ media_type: 'video', storage_path: 'p/v.mp4', public_url: 'https://e.com/v.mp4' }],
    },
  },
];

afterAll(async () => {
  await cleanupTestData();
});

describe('POST /posts invalid type/transaction combinations', () => {
  it.each(INVALID_BODIES)('$name is rejected by zod with field_errors', async ({ body, field }) => {
    const res = await request(app).post('/api/v1/posts').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.field_errors).toBeDefined();
    expect(res.body.error.field_errors.length).toBeGreaterThan(0);
    if (field) {
      expect(res.body.error.field_errors.some((e: { field: string }) => e.field === field)).toBe(
        true,
      );
    }
  });

  it('none of the four rejections left an orphan post behind', async () => {
    const [{ count }] = await sql<[{ count: number }]>`
      SELECT count(*)::int AS count FROM posts WHERE body LIKE ${MARKER + '%'}
    `;
    expect(count).toBe(0);
  });
});
