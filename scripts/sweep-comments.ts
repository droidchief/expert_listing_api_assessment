const BASE = process.argv[2] ?? 'http://localhost:3000/api/v1';
const POST_ID = process.argv[3];
const SORT = process.argv[4] ?? 'newest';

if (!POST_ID) {
  console.error('Usage: sweep-comments.ts <base> <postId> [sort]');
  process.exit(1);
}

interface SweepItem {
  id: string;
  created_at: string;
}

interface PageResponse {
  data: SweepItem[];
  pagination: { next_cursor: string | null; has_more: boolean; limit: number };
}

async function main() {
  const ids: string[] = [];
  const timestamps: string[] = [];
  let cursor: string | null = null;
  let page = 0;
  let finalHasMore: boolean;
  let finalNextCursor: string | null;

  for (;;) {
    page += 1;
    const url = new URL(`${BASE}/posts/${POST_ID}/comments`);
    url.searchParams.set('limit', '2');
    url.searchParams.set('sort', SORT);
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url);
    const body = (await res.json()) as PageResponse;

    for (const item of body.data) {
      ids.push(item.id);
      timestamps.push(item.created_at);
    }

    finalHasMore = body.pagination.has_more;
    finalNextCursor = body.pagination.next_cursor;

    if (!body.pagination.has_more) break;
    cursor = body.pagination.next_cursor;
    if (page > 20) {
      console.error('Aborting: too many pages, likely an infinite loop.');
      process.exit(1);
    }
  }

  const distinct = new Set(ids);
  let monotonic = true;
  for (let i = 1; i < timestamps.length; i++) {
    const a = new Date(timestamps[i]!).getTime();
    const b = new Date(timestamps[i - 1]!).getTime();
    const ok = SORT === 'oldest' ? a >= b : a <= b;
    if (!ok) {
      monotonic = false;
      break;
    }
  }

  console.log(`Sort: ${SORT}`);
  console.log(`Pages: ${page}`);
  console.log(`Total ids: ${ids.length}`);
  console.log(`Distinct ids: ${distinct.size}`);
  console.log(`Monotonic (${SORT === 'oldest' ? 'non-decreasing' : 'non-increasing'}): ${monotonic}`);
  console.log(`Final has_more: ${finalHasMore}`);
  console.log(`Final next_cursor: ${finalNextCursor}`);
  console.log(`ids: ${ids.join(', ')}`);

  const ok =
    ids.length === distinct.size && monotonic && finalHasMore === false && finalNextCursor === null;
  console.log(ok ? 'SWEEP PASSED' : 'SWEEP FAILED');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
