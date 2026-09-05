// Production smoke test: hits every route, prints status + latency, exits non-zero on
// any failure. Run this before recording the walkthrough video.
//
// Usage: npx tsx scripts/smoke.ts --base https://expert-listing-backend.vercel.app/api/v1
//
// POST /posts, POST /posts/:id/like and POST /posts/:id/comments create real rows
// against whatever --base points at, so this script creates its own [TEST]-prefixed
// fixture post and deletes exactly that row (direct SQL, same as the integration
// tests' cleanup) before exiting — the seed data a demo depends on is never touched.
import { sql } from '../src/config/db.js';

const args = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
const BASE = baseIndex !== -1 ? args[baseIndex + 1] : 'http://localhost:3000/api/v1';

if (!BASE) {
  console.error('Usage: smoke.ts --base <url>');
  process.exit(1);
}

interface Result {
  name: string;
  method: string;
  path: string;
  status: number;
  expected: number;
  ms: number;
  ok: boolean;
}

const results: Result[] = [];

async function hit(
  name: string,
  method: string,
  path: string,
  expected: number,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const start = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const ms = performance.now() - start;
  const json = await res.json().catch(() => null);
  results.push({ name, method, path, status: res.status, expected, ms, ok: res.status === expected });
  return { status: res.status, json };
}

async function main() {
  await hit('health', 'GET', '/health', 200);
  await hit('me', 'GET', '/me', 200);
  const feed = await hit('feed', 'GET', '/posts?limit=1', 200);
  await hit('filters', 'GET', '/filters/options', 200);
  await hit('locations', 'GET', '/locations?q=lek', 200);
  await hit('stories', 'GET', '/stories', 200);
  await hit('upload-sign', 'POST', '/uploads/sign', 200, {
    bucket: 'post-media',
    content_type: 'image/webp',
  });

  const composer = await hit('composer', 'POST', '/posts', 201, {
    post_type: 'general',
    body: '[TEST] smoke test fixture — safe to ignore or delete',
  });
  const postId = (composer.json as { data?: { id?: string } })?.data?.id ?? null;

  if (postId) {
    await hit('like', 'POST', `/posts/${postId}/like`, 200, { action: 'like' });
    await hit('comment-create', 'POST', `/posts/${postId}/comments`, 201, {
      body: '[TEST] smoke test comment',
    });
    const feedId = (feed.json as { data?: { id?: string }[] })?.data?.[0]?.id;
    if (feedId) await hit('comments-list', 'GET', `/posts/${feedId}/comments`, 200);

    const cleaned = await sql`DELETE FROM posts WHERE id = ${postId}::uuid RETURNING id`;
    await sql`SELECT recompute_post_counters()`;
    console.log(`Cleaned up smoke fixture post: ${cleaned.length === 1 ? 'ok' : 'MISSING'}`);
  } else {
    console.error('Composer did not return an id — skipping like/comment checks and cleanup.');
  }

  console.log('');
  console.log(`${'ENDPOINT'.padEnd(18)}${'METHOD'.padEnd(8)}${'STATUS'.padEnd(10)}${'LATENCY'.padEnd(10)}RESULT`);
  for (const r of results) {
    console.log(
      `${r.name.padEnd(18)}${r.method.padEnd(8)}${String(r.status).padEnd(10)}${`${r.ms.toFixed(0)}ms`.padEnd(10)}${r.ok ? 'PASS' : 'FAIL'}`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log('');
  console.log(failed.length === 0 ? 'SMOKE PASSED' : `SMOKE FAILED (${failed.length} endpoint(s))`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
