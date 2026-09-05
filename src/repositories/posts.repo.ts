import { sql } from '../config/db.js';

export interface FeedRowAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  avatar_blurhash: string | null;
  role: string | null;
  is_verified: boolean;
  is_business: boolean;
}

export interface FeedRowMedia {
  id: string;
  media_type: string;
  url: string;
  thumbnail_url: string | null;
  blurhash: string | null;
  width_px: number | null;
  height_px: number | null;
  aspect_ratio: string | null;
  duration_seconds: number | null;
  alt_text: string | null;
  position: number;
}

export interface FeedRowTopComment {
  id: string;
  body: string;
  created_at: string;
  author: { username: string; display_name: string; avatar_url: string | null };
}

export interface FeedRowLiker {
  username: string;
  avatar_url: string | null;
}

// Matches get_feed()'s RETURNS TABLE column-for-column. The four jsonb columns
// (author, media, top_comment, liked_by) arrive already parsed as JS values —
// postgres.js does that automatically; do not JSON.parse them again.
export interface FeedRow {
  id: string;
  post_type: string;
  body: string;
  transaction_type: string | null;
  location_id: string | null;
  location_label: string | null;
  latitude: string | null;
  longitude: string | null;
  price_amount: string | null;
  price_currency: string;
  price_period: string | null;
  is_price_negotiable: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  property_size_sqm: string | null;
  amenities: string[];
  available_from: string | null;
  inspection_at: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  bookmark_count: number;
  view_count: number;
  media_count: number;
  is_edited: boolean;
  is_pinned: boolean;
  // Full microsecond-precision text form of created_at (see selectFeed) — used for
  // both the DTO's timestamp and the pagination cursor. The plain `created_at`
  // column below is left unused deliberately: postgres.js parses timestamptz into
  // a JS Date, which only has millisecond precision, and two rows can tie on the
  // millisecond while differing in the microseconds seed data actually carries.
  created_at: string;
  created_at_iso: string;
  author: FeedRowAuthor;
  media: FeedRowMedia[];
  top_comment: FeedRowTopComment | null;
  liked_by: FeedRowLiker[];
  viewer_has_liked: boolean;
}

export interface FeedQueryParams {
  viewerId: string;
  limit: number;
  // A precise ISO-8601 string, not a Date — see the note on FeedRow.created_at_iso.
  cursorTs: string | null;
  cursorId: string | null;
  postTypes: string[] | null;
  transactionTypes: string[] | null;
  locationIds: string[] | null;
  minPrice: number | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  hasMedia: boolean | null;
  postedAfter: Date | null;
}

// Every argument carries an explicit cast — Postgres cannot infer the type of a null
// parameter and fails with "could not determine polymorphic type" otherwise.
export async function selectFeed(params: FeedQueryParams): Promise<FeedRow[]> {
  // Wraps get_feed() (unmodified) in one extra SELECT — still a single round trip —
  // to add a full-precision text form of created_at. postgres.js parses timestamptz
  // columns into a JS Date on the way out (millisecond precision only), and — the
  // less obvious half of the same problem — it ALSO silently truncates a plain JS
  // string parameter bound against a `::timestamptz` cast to millisecond precision
  // on the way in, because it detects the date-like string and round-trips it
  // through a Date before sending it. Seed data ties multiple rows on the exact
  // same microsecond, so a truncated cursor parameter re-includes or skips a row at
  // that exact tie boundary. sql.typed(value, 25) forces the bind parameter to the
  // TEXT oid, bypassing postgres.js's own serialization so Postgres's *own*
  // text-to-timestamptz parser (which does preserve microseconds) handles it.
  const cursorTs = params.cursorTs === null ? null : sql.typed(params.cursorTs, 25);

  return sql<FeedRow[]>`
    SELECT f.*, (to_json(f.created_at) #>> '{}') AS created_at_iso
    FROM get_feed(
      ${params.viewerId}::uuid,
      ${params.limit}::int,
      ${cursorTs}::timestamptz,
      ${params.cursorId}::uuid,
      ${params.postTypes}::post_type[],
      ${params.transactionTypes}::transaction_type[],
      ${params.locationIds}::uuid[],
      ${params.minPrice}::numeric,
      ${params.maxPrice}::numeric,
      ${params.minBedrooms}::smallint,
      ${params.hasMedia}::boolean,
      ${params.postedAfter}::timestamptz
    ) AS f
  `;
}
