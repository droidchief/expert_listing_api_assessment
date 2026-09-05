# API Reference

Base URL:

```
https://expert-listing-backend.vercel.app/api/v1
```

Locally: `http://localhost:3000/api/v1`.

## Conventions

### Auth (mock)

There is no real authentication in this build. Every request is attributed to a
"viewer" resolved by [`src/middleware/mockAuth.ts`](../src/middleware/mockAuth.ts):

```
X-User-Id: <uuid>
```

- Present and a valid uuid shape → that id is the viewer for the request.
- Absent, empty, or not uuid-shaped → falls back to `MOCK_USER_ID` (defaults to
  `miracle.h`, `00000000-0000-0000-0000-000000000001`).

This is the single seam a real JWT check would replace — nothing downstream cares how
`req.user.id` was populated.

### Response envelope

Every successful response is one of two shapes.

A single resource:

```json
{
  "data": { "...": "..." },
  "meta": { "request_id": "AbCdEf123", "server_time": "2026-09-05T18:17:36.642Z" }
}
```

A paginated list:

```json
{
  "data": [{ "...": "..." }],
  "pagination": { "next_cursor": "eyJ0cyI6...", "has_more": true, "limit": 20 },
  "meta": { "request_id": "AbCdEf123", "server_time": "2026-09-05T18:17:36.642Z" }
}
```

### Cursor format

`next_cursor` is an opaque, base64url-encoded JSON object `{ ts, id }` — the
full-microsecond-precision `created_at` and `id` of the last row on the page. It is a
**keyset** cursor, not an offset: pass it back verbatim as `?cursor=...` to get the
next page, alongside every other filter from the first request (filters are not
remembered server-side). Never construct or edit a cursor by hand — a malformed one is
rejected as `400 INVALID_CURSOR`, not silently treated as page 1.

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "field_errors": [{ "field": "limit", "message": "Too small: expected number to be >=1" }],
    "retryable": false
  },
  "meta": { "request_id": "AbCdEf123", "server_time": "2026-09-05T18:17:36.642Z" }
}
```

`field_errors` is present only for validation failures. `retryable` is `true` for
every 5xx and 429, `false` for every other 4xx — a client can use it directly to decide
whether to auto-retry.

### Error code table

| Code | HTTP | Retryable | Meaning |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | no | Request body/query/params failed zod validation, or a malformed JSON body |
| `INVALID_CURSOR` | 400 | no | The `cursor` param is malformed or unparseable |
| `FORBIDDEN` | 403 | no | (Reserved — no endpoint currently returns this) |
| `NOT_FOUND` | 404 | no | Generic missing resource (e.g. an FK target) |
| `ROUTE_NOT_FOUND` | 404 | no | No route matches the request path |
| `POST_NOT_FOUND` | 404 | no | The post in the URL doesn't exist, is deleted, or isn't active |
| `USER_NOT_FOUND` | 404 | no | `GET /me` couldn't find the viewer's user row |
| `PARENT_COMMENT_NOT_FOUND` | 404 | no | `parent_comment_id` doesn't exist |
| `CONFLICT` | 409 | no | Generic unique-constraint violation |
| `MAX_REPLY_DEPTH` | 409 | no | A reply's parent is itself a reply (max one level deep) |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | no | `content_type` isn't allowed for the target Storage bucket |
| `PAYLOAD_TOO_LARGE` | 413 | no | `byte_size` exceeds the bucket's file size limit |
| `RATE_LIMIT` | 429 | yes | Per-IP rate limit exceeded — see `Retry-After` header |
| `INTERNAL_ERROR` | 500 | yes | Unhandled error or unrecognised Postgres SQLSTATE |
| `DATABASE_UNAVAILABLE` | 503 | yes | Connection failure, timeout, or too-many-connections from Postgres |

Full mapping from Postgres SQLSTATE to these codes lives in
[`src/errors/pgErrorMap.ts`](../src/errors/pgErrorMap.ts).

### Rate limits

100 requests/min per IP on `GET`, 20 requests/min per IP on `POST`, tracked in
separate buckets. `/health` is exempt. See the README's "Known limitations" section
for what "per IP" actually means on serverless.

---

## `GET /health`

Liveness/readiness probe. Not part of the assessment brief's four required endpoints,
but every serverless deployment needs one and it's what `/health` in the rate limiter's
skip-list refers to.

**Query params:** none.

**Example response — `200`:**

```json
{
  "data": {
    "status": "ok",
    "uptime_s": 134,
    "version": "1.0.0",
    "db": { "ok": true, "latency_ms": 42.7 },
    "mock_user": { "id": "00000000-...-001", "resolved": true, "username": "miracle.h" }
  },
  "meta": { "request_id": "...", "server_time": "..." }
}
```

**Errors:** none — this endpoint does not run through the standard envelope/error
pipeline (see [`src/routes/health.routes.ts`](../src/routes/health.routes.ts)).

---

## ⭐ `GET /me`

Required by the brief. Returns the mock-authenticated viewer's own profile.

**Query params:** none. **Path params:** none.

**Headers:** `X-User-Id` (optional, see Auth above).

**Example request:**

```
GET /api/v1/me
X-User-Id: 00000000-0000-0000-0000-000000000001
```

**Example response — `200`:**

```json
{
  "data": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "miracle.h",
    "display_name": "Miracle H",
    "avatar_url": "https://i.pravatar.cc/150?u=miracle.h",
    "avatar_blurhash": null,
    "bio": null,
    "role": "individual",
    "role_label": "Individual",
    "is_verified": false,
    "is_business": false,
    "company_name": null,
    "location": { "city": null, "state": "Lagos", "country_code": "NG" },
    "default_location": null,
    "counts": { "posts": 6 }
  },
  "meta": { "request_id": "IcQ2W1FR", "server_time": "2026-09-05T18:17:36.642Z" }
}
```

**Errors:** `USER_NOT_FOUND` (404) — the resolved viewer id doesn't exist or is
soft-deleted.

---

## ⭐ `GET /posts`

Required by the brief. The main paginated feed. One database round trip per page via
`get_feed()` — see the README's schema section for why.

**Query params:**

| Name | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `limit` | int | no | `20` | min `1` (400 below), clamps silently to `50` above |
| `cursor` | string | no | — | opaque keyset cursor from a previous page's `pagination.next_cursor` |
| `post_type` | string or CSV | no | — | any of `general`, `property`, `request` |
| `transaction_type` | string or CSV | no | — | any of `for_sale`, `for_rent`, `for_shortlet`, `looking_to_buy`, `looking_to_rent`, `looking_for_shortlet` |
| `location_id` | uuid or CSV | no | — | must be a valid uuid shape |
| `min_price` | number | no | — | ≥ 0 |
| `max_price` | number | no | — | ≥ 0; if both given, `min_price` must not exceed `max_price` (400 otherwise) |
| `min_bedrooms` | int | no | — | 0–50 |
| `has_media` | `"true"` \| `"false"` | no | — | — |
| `posted_within` | string | no | — | one of `24h`, `7d`, `30d` |

All filters combine with AND. The schema is `.strict()` — an unrecognised query
param is `400 VALIDATION_ERROR`.

**Example request:**

```
GET /api/v1/posts?post_type=property&transaction_type=for_rent&limit=10
```

**Example response — `200`:**

```json
{
  "data": [
    {
      "id": "20000000-0000-0000-0000-000000000001",
      "post_type": "property",
      "body": "Newly serviced 3-bedroom apartment available for rent, fully furnished.",
      "transaction_type": "for_rent",
      "transaction_label": "For Rent",
      "location_id": "10000000-0000-0000-0000-000000000001",
      "location_label": "Lekki Phase 1, Lagos",
      "coordinates": null,
      "price": { "amount": 4500000, "currency": "NGN", "period": "per_annum", "negotiable": false },
      "property": {
        "bedrooms": 3, "bathrooms": 3, "parking_spaces": 2, "size_sqm": null,
        "amenities": ["gym", "pool"], "available_from": null, "inspection_at": null
      },
      "author": {
        "id": "...", "username": "ramosrealty", "display_name": "Ramos Realty",
        "avatar_url": "...", "avatar_blurhash": null, "role": "agent",
        "role_label": "Agent", "is_verified": true, "is_business": true
      },
      "show_role_badge": true,
      "media": [{ "id": "...", "media_type": "image", "url": "...", "position": 0 }],
      "counts": { "likes": 12, "comments": 4, "shares": 3, "bookmarks": 2, "views": 812 },
      "viewer_state": { "has_liked": false, "is_author": false },
      "liked_by_preview": { "total": 12, "users": [{ "username": "jordan", "avatar_url": "..." }] },
      "top_comment": { "id": "...", "body": "Is this still available?", "created_at": "...", "author": { "...": "..." } },
      "is_edited": false,
      "is_pinned": false,
      "created_at": "2026-09-04T16:32:31.519166+00:00"
    }
  ],
  "pagination": { "next_cursor": "eyJ0cyI6...", "has_more": true, "limit": 10 },
  "meta": { "request_id": "...", "server_time": "..." }
}
```

**Errors:** `VALIDATION_ERROR` (400), `INVALID_CURSOR` (400).

---

## `POST /posts`

The composer. Not one of the brief's four named endpoints, but required to create the
content the other endpoints act on.

**Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `post_type` | enum | yes | `general` \| `property` \| `request` |
| `body` | string | yes | trimmed, 1–5000 chars |
| `transaction_type` | enum | conditional | forbidden for `general`; required, and must match the type's allowed set, for `property`/`request` |
| `location_id` | uuid | no | must reference an existing location (400 if not) |
| `latitude` / `longitude` | number | no | both present or both absent; -90..90 / -180..180 |
| `price_amount` | number | no | ≥ 0 |
| `price_currency` | string | no | 3 uppercase letters, default `NGN` |
| `price_period` | enum | no | `total` \| `per_annum` \| `per_month` \| `per_night` |
| `is_price_negotiable` | boolean | no | — |
| `bedrooms` / `bathrooms` | int | no | 0–50 |
| `parking_spaces` | int | no | 0–100 |
| `property_size_sqm` | number | no | > 0 |
| `amenities` | string[] | no | ≤ 30 items |
| `available_from` | date string | no | — |
| `inspection_at` | datetime string | no | — |
| `media` | array | no | ≤ 10 items, see below |

Each `media` item: `media_type` (`image`\|`video`, required), `storage_path` and
`public_url` (required, from `POST /uploads/sign`), plus optional
`thumbnail_url`/`blurhash`/`width_px`/`height_px`/`duration_seconds`/`mime_type`/
`byte_size`/`alt_text`/`position` (0–9). `duration_seconds` is **required** when
`media_type` is `video`.

**Example request:**

```json
{
  "post_type": "property",
  "body": "Newly serviced 3-bedroom in Lekki Phase 1.",
  "transaction_type": "for_rent",
  "bedrooms": 3,
  "parking_spaces": 2,
  "price_amount": 12000000,
  "price_period": "per_annum"
}
```

**Example response — `201`:**

```json
{
  "data": { "id": "6f19c02b-...", "created_at": "2026-09-05T18:17:48.07943+00:00" },
  "meta": { "request_id": "...", "server_time": "..." }
}
```

**Errors:** `VALIDATION_ERROR` (400, with `field_errors` — covers every combination
CHECK constraint below the database enforces too), `NOT_FOUND`-shaped
`VALIDATION_ERROR` with field `location_id` (400, when `location_id` doesn't exist —
returned as a validation error rather than 404 because a bad foreign key here is a
client input mistake, not a missing top-level resource), `CONFLICT` (409, e.g. two
media items sharing the same `position`). The insert and its media rows are one
transaction inside `create_post()` — any media-row failure rolls the whole post back.

---

## ⭐ `POST /posts/:id/like`

Required by the brief. Idempotent toggle backed by `post_likes`' composite primary key
`(post_id, user_id)` — see the README's schema section.

**Path params:** `id` (uuid, the post).

**Body (optional):**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `action` | enum | no | `like` \| `unlike`. Omitted → flips whichever state currently holds. |

**Example request:**

```json
POST /api/v1/posts/20000000-0000-0000-0000-000000000001/like
{ "action": "like" }
```

**Example response — `200`:**

```json
{
  "data": { "post_id": "20000000-...-001", "has_liked": true, "like_count": 13 },
  "meta": { "request_id": "...", "server_time": "..." }
}
```

**Errors:** `VALIDATION_ERROR` (400 — malformed uuid, unknown body key, or invalid
`action` value), `POST_NOT_FOUND` (404 — missing, soft-deleted, or inactive post).

---

## ⭐ `GET /posts/:id/comments`

Required by the brief. Root comments only (max depth one level), each carrying up to
2 embedded replies in `replies_preview`.

**Path params:** `id` (uuid, the post).

**Query params:**

| Name | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `limit` | int | no | `20` | min `1`, clamps to `50` |
| `cursor` | string | no | — | opaque keyset cursor |
| `sort` | enum | no | `newest` | `newest` \| `oldest` |

**Example response — `200`:**

```json
{
  "data": [
    {
      "id": "...", "post_id": "...", "body": "Is the parking secured?",
      "author": { "id": "...", "username": "jordan", "display_name": "Jordan", "avatar_url": "...", "role": null, "role_label": null, "is_verified": false },
      "counts": { "likes": 0, "replies": 1 },
      "viewer_state": { "is_author": false },
      "replies_preview": [{ "id": "...", "body": "Yes, gated compound.", "created_at": "...", "author": { "username": "ramosrealty", "display_name": "Ramos Realty", "avatar_url": "..." } }],
      "is_edited": false,
      "created_at": "2026-09-04T20:10:00.000000+00:00"
    }
  ],
  "pagination": { "next_cursor": null, "has_more": false, "limit": 20 },
  "meta": { "request_id": "...", "server_time": "..." }
}
```

**Errors:** `POST_NOT_FOUND` (404 — a GET on a nonexistent post is 404, never an empty
array), `INVALID_CURSOR` (400).

---

## ⭐ `POST /posts/:id/comments`

Required by the brief. Creates a root comment or, with `parent_comment_id`, a single
reply.

**Path params:** `id` (uuid, the post).

**Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `body` | string | yes | trimmed, 1–2000 chars |
| `parent_comment_id` | uuid | no | must belong to the same post and itself be a root comment |
| `client_token` | string | no | 8–64 chars; repeating it returns the original comment idempotently instead of creating a duplicate |

**Example request:**

```json
POST /api/v1/posts/20000000-0000-0000-0000-000000000002/comments
{ "body": "Is the parking secured?" }
```

**Example response — `201`:**

```json
{
  "data": {
    "comment": { "id": "...", "post_id": "...", "body": "Is the parking secured?", "author": { "...": "..." }, "counts": { "likes": 0, "replies": 0 }, "viewer_state": { "is_author": true }, "replies_preview": [], "is_edited": false, "created_at": "..." },
    "post_comment_count": 8
  },
  "meta": { "request_id": "...", "server_time": "..." }
}
```

**Errors:** `VALIDATION_ERROR` (400 — empty/whitespace-only body, unknown body key,
`client_token` under 8 chars, or `parent_comment_id` belonging to a different post),
`POST_NOT_FOUND` (404), `PARENT_COMMENT_NOT_FOUND` (404 — `parent_comment_id` doesn't
exist), `MAX_REPLY_DEPTH` (409 — `parent_comment_id` is itself a reply). Two concurrent
requests with the same `client_token` never both succeed as separate comments — the
loser detects the winner's row via the token and returns it instead of a 409.

---

## ⭐ `GET /filters/options`

Required by the brief. Static + dynamic metadata for the filter sheet — the design
only shows a button for this, so its contents are this project's own call (see the
README's assumptions section).

**Query params:** none.

**Example response — `200`:**

```json
{
  "data": {
    "post_types": [{ "value": "general", "label": "General" }, { "value": "property", "label": "Property" }, { "value": "request", "label": "Request" }],
    "transaction_types": [{ "value": "for_rent", "label": "For Rent", "post_type": "property" }],
    "locations": [{ "id": "10000000-...-001", "label": "Lekki Phase 1, Lagos", "post_count": 6 }],
    "bedrooms": [{ "value": 1, "label": "1+" }, { "value": 2, "label": "2+" }],
    "posted_within": [{ "value": "24h", "label": "Last 24 hours" }],
    "price_range": { "min": 0, "max": 160000000, "currency": "NGN" }
  },
  "meta": { "request_id": "...", "server_time": "..." }
}
```

**Errors:** none beyond a possible `DATABASE_UNAVAILABLE` (503).

---

## `GET /locations`

Typeahead search for the location picker (feeds `location_id` on `POST /posts` and the
feed filter).

**Query params:**

| Name | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `q` | string | no | — | trimmed, 1–60 chars; case-insensitive substring match |
| `parent_id` | uuid | no | — | scope results to children of this location |
| `limit` | int | no | `20` | min `1`, clamps to `50` |

Omitting `q` returns the most-used locations (by `post_count`) rather than an empty
or arbitrary list.

**Example request:**

```
GET /api/v1/locations?q=lek
```

**Example response — `200`:**

```json
{
  "data": [
    { "id": "10000000-...-001", "name": "Lekki Phase 1", "display_label": "Lekki Phase 1, Lagos", "city": "Lagos", "state": "Lagos", "level": 3, "post_count": 6 },
    { "id": "d29f7864-...", "name": "Lekki Phase 2", "display_label": "Lekki Phase 2, Lagos", "city": "Lagos", "state": "Lagos", "level": 3, "post_count": 2 }
  ],
  "meta": { "request_id": "...", "server_time": "..." }
}
```

A query with no matches returns `200` with `"data": []`, never `404`.

**Errors:** `VALIDATION_ERROR` (400).

---

## `GET /stories`

The stories rail: one row per author with a live (unexpired) story.

**Query params:** none.

**Example response — `200`:**

```json
{
  "data": [
    {
      "author": { "id": "...", "username": "taylor", "display_name": "Taylor", "avatar_url": "...", "is_verified": false, "is_business": false },
      "story_count": 1,
      "has_unseen": true,
      "preview_url": "https://picsum.photos/seed/story-taylor/1080/1920",
      "latest_at": "2026-09-05T14:32:31.519166+00:00"
    }
  ],
  "meta": { "request_id": "...", "server_time": "..." }
}
```

Sorted unseen-first, then by most recent story. `has_unseen` and ordering are scoped
to the viewer (`X-User-Id`) — two viewers see independent results for the same data.

**Errors:** none beyond a possible `DATABASE_UNAVAILABLE` (503).

---

## `POST /uploads/sign`

Signs a direct-to-Storage upload URL. The path is always server-generated — the
client never supplies or controls where a file lands, which prevents one user's
upload from overwriting another's object.

**Body:**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `bucket` | enum | yes | `post-media` \| `avatars` \| `story-media` |
| `content_type` | string | yes | must be in the bucket's allowed MIME list |
| `byte_size` | int | no | if given, must not exceed the bucket's file size limit |

| Bucket | Size limit | Allowed MIME types |
|---|---|---|
| `post-media` | 50 MB | `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/quicktime` |
| `avatars` | 2 MB | `image/jpeg`, `image/png`, `image/webp` |
| `story-media` | 10 MB | `image/jpeg`, `image/png`, `image/webp`, `video/mp4` |

**Example request:**

```json
{ "bucket": "post-media", "content_type": "image/webp" }
```

**Example response — `200`:**

```json
{
  "data": {
    "bucket": "post-media",
    "path": "posts/3f2a.../8b91....webp",
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "signed_url": "https://<ref>.supabase.co/storage/v1/object/upload/sign/post-media/...",
    "public_url": "https://<ref>.supabase.co/storage/v1/object/public/post-media/posts/3f2a.../8b91....webp"
  },
  "meta": { "request_id": "...", "server_time": "..." }
}
```

The client `PUT`s the file bytes to `signed_url`, then uses `public_url` (or
`storage_path`/`public_url` from this response) as the `media[].storage_path` /
`media[].public_url` values on `POST /posts`.

**Errors:** `VALIDATION_ERROR` (400 — unknown `bucket`), `UNSUPPORTED_MEDIA_TYPE` (415
— `content_type` not allowed for that bucket), `PAYLOAD_TOO_LARGE` (413 — `byte_size`
over the bucket's limit).
