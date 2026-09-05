import { sql } from '../config/db.js';

export interface ToggleLikeResult {
  liked: boolean;
  like_count: number;
}

// Explicit cast on all three, as always. desired is null for the toggle form.
// like_count is integer (not numeric), so no string conversion is needed here —
// unlike the feed's numeric columns.
export async function togglePostLike(
  postId: string,
  userId: string,
  desired: boolean | null,
): Promise<ToggleLikeResult> {
  const [row] = await sql<[ToggleLikeResult]>`
    SELECT * FROM toggle_post_like(
      ${postId}::uuid,
      ${userId}::uuid,
      ${desired}::boolean
    )
  `;
  return row;
}
