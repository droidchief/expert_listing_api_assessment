import { togglePostLike } from '../repositories/likes.repo.js';
import { pgErrorMap } from '../errors/pgErrorMap.js';
import { NotFoundError } from '../errors/AppError.js';
import type { LikeBody } from '../schemas/like.schema.js';

export interface LikeResult {
  post_id: string;
  has_liked: boolean;
  like_count: number;
}

export async function toggleLike(
  postId: string,
  userId: string,
  action: LikeBody['action'],
): Promise<LikeResult> {
  const desired = action === 'like' ? true : action === 'unlike' ? false : null;

  try {
    const result = await togglePostLike(postId, userId, desired);
    return { post_id: postId, has_liked: result.liked, like_count: result.like_count };
  } catch (err) {
    // toggle_post_like raises P0002 when the post is missing, soft-deleted, or not
    // active. Re-thrown with the specific code the client expects, rather than the
    // generic NOT_FOUND pgErrorMap would otherwise produce.
    const mapped = pgErrorMap(err);
    if (mapped?.status === 404) {
      throw new NotFoundError('POST_NOT_FOUND', 'That post no longer exists.');
    }
    throw err;
  }
}
