import { randomUUID } from 'node:crypto';
import { sql } from '../../src/config/db.js';

export interface TestUser {
  id: string;
  username: string;
}

// Vitest test files run in parallel by default, each importing this module fresh
// (isolate: true), so these arrays are scoped to a single file's own fixtures — not
// shared across files. cleanupTestData() deletes exactly these ids, never a blanket
// `LIKE '[TEST]%'`/`LIKE 'test.%'` sweep, because that pattern matches every other
// file's still-in-use fixtures too and was deleting them mid-run (a concurrently
// finishing file's afterAll would wipe rows another file's test was still using,
// surfacing as a spurious 404 partway through an otherwise-passing test). The global
// teardown (tests/globalSetup.ts) still does the LIKE-based sweep, once, after every
// file has finished — that's the right place for a pattern-wide check.
const createdUserIds: string[] = [];
const createdPostIds: string[] = [];

// username is prefixed test. and suffixed with a random id — the marker the global
// teardown searches for. users.username is CHECK-constrained to ^[a-z0-9._]{3,30}$
// (no hyphens), so a label like "comment-depth" has to be sanitized before it reaches
// the query.
export async function createTestUser(label: string): Promise<TestUser> {
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9._]/g, '_');
  const username = `test.${safeLabel}.${randomUUID().slice(0, 8)}`;
  const [row] = await sql<[{ id: string }]>`
    INSERT INTO users (username, display_name)
    VALUES (${username}, ${`Test ${label}`})
    RETURNING id
  `;
  createdUserIds.push(row.id);
  return { id: row.id, username };
}

export interface TestPostOverrides {
  post_type?: 'general' | 'property' | 'request';
  transaction_type?: string | null;
  bedrooms?: number | null;
  price_amount?: number | null;
  price_period?: string | null;
  location_id?: string | null;
}

export interface TestPost {
  id: string;
  created_at: string;
}

// body always starts with [TEST] — the marker every cleanup path relies on.
export async function createTestPost(
  authorId: string,
  bodySuffix: string,
  overrides: TestPostOverrides = {},
): Promise<TestPost> {
  const body = `[TEST] ${bodySuffix}`;
  const [row] = await sql<[{ id: string; created_at_iso: string }]>`
    INSERT INTO posts (
      author_id, body, post_type, transaction_type, bedrooms, price_amount, price_period, location_id
    )
    VALUES (
      ${authorId}::uuid, ${body}, ${overrides.post_type ?? 'general'}::post_type,
      ${overrides.transaction_type ?? null}::transaction_type,
      ${overrides.bedrooms ?? null}, ${overrides.price_amount ?? null},
      ${overrides.price_period ?? null}::price_period, ${overrides.location_id ?? null}::uuid
    )
    RETURNING id, (to_json(created_at) #>> '{}') AS created_at_iso
  `;
  createdPostIds.push(row.id);
  return { id: row.id, created_at: row.created_at_iso };
}

// Deletes only the ids this file's own fixtures created (see the note above on why
// not a blanket LIKE match). Posts cascade to post_media, comments and post_likes via
// FK ON DELETE CASCADE; deleting users cascades any of their rows that survive
// independently of a test post (e.g. a fixture user with no post at all).
export async function cleanupTestData(): Promise<void> {
  if (createdPostIds.length > 0) {
    await sql`DELETE FROM posts WHERE id = ANY(${createdPostIds}::uuid[])`;
    createdPostIds.length = 0;
  }
  if (createdUserIds.length > 0) {
    await sql`DELETE FROM users WHERE id = ANY(${createdUserIds}::uuid[])`;
    createdUserIds.length = 0;
  }
  await sql`SELECT recompute_post_counters()`;
}
