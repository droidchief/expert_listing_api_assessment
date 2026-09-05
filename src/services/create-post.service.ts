import type postgres from 'postgres';
import { createPost, type CreatedPost } from '../repositories/posts.repo.js';
import { ValidationError } from '../errors/AppError.js';
import type { CreatePostBody } from '../schemas/create-post.schema.js';

interface PgLikeError {
  code: string;
}

function isPgLikeError(err: unknown): err is PgLikeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  );
}

// Returns only { id, created_at } — not the fully hydrated feed item. get_feed has no
// by-id filter, so fetching the new post back would mean either a fragile
// "newest row must be mine" assumption or a new RPC. The composer refreshes the feed
// after posting instead — one extra request, always correct, no race.
export async function createPostFromBody(
  authorId: string,
  body: CreatePostBody,
): Promise<CreatedPost> {
  try {
    // Cast is safe: CreatePostBody is a zod-inferred plain object of JSON-safe
    // values (strings, numbers, booleans, arrays of such) — it just doesn't
    // structurally match postgres.js's recursive JSONValue type without help.
    // sql.json() (in the repository) serializes it; an absent key naturally
    // becomes NULL for create_post(), matching its expectations.
    return await createPost(authorId, body as unknown as postgres.JSONValue);
  } catch (err) {
    // 23503 here can only be the location_id foreign key (author_id is always
    // valid — it's the authenticated viewer). pgErrorMap's generic 404 doesn't fit:
    // a bad location_id is a client input mistake, not a missing resource.
    if (isPgLikeError(err) && err.code === '23503') {
      throw new ValidationError('Request validation failed.', [
        { field: 'location_id', message: 'That location could not be found.' },
      ]);
    }
    throw err;
  }
}
