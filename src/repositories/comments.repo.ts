import { sql, typedTimestamp } from '../config/db.js';

export interface CommentRowAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: string | null;
  is_verified: boolean;
}

export interface CommentRowReply {
  id: string;
  body: string;
  created_at: string;
  author: { username: string; display_name: string; avatar_url: string | null };
}

// Matches get_post_comments()'s RETURNS TABLE, plus created_at_iso (see selectComments).
export interface CommentRow {
  id: string;
  post_id: string;
  body: string;
  like_count: number;
  reply_count: number;
  is_edited: boolean;
  created_at: string;
  created_at_iso: string;
  author: CommentRowAuthor;
  replies_preview: CommentRowReply[];
}

export interface CommentQueryParams {
  postId: string;
  limit: number;
  cursorTs: string | null;
  cursorId: string | null;
  sort: 'newest' | 'oldest';
}

export async function postIsVisible(postId: string): Promise<boolean> {
  const [row] = await sql<[{ exists: boolean }]>`
    SELECT EXISTS(
      SELECT 1 FROM posts WHERE id = ${postId}::uuid AND deleted_at IS NULL AND status = 'active'
    )
  `;
  return row.exists;
}

// Wraps get_post_comments() (unmodified) in one extra SELECT for a full-precision
// text form of created_at — see typedTimestamp for why the cursor parameter needs it.
export async function selectComments(params: CommentQueryParams): Promise<CommentRow[]> {
  const cursorTs = typedTimestamp(params.cursorTs);

  return sql<CommentRow[]>`
    SELECT f.*, (to_json(f.created_at) #>> '{}') AS created_at_iso
    FROM get_post_comments(
      ${params.postId}::uuid,
      ${params.limit}::int,
      ${cursorTs}::timestamptz,
      ${params.cursorId}::uuid,
      ${params.sort}::text
    ) AS f
  `;
}

export interface HydratedComment {
  id: string;
  post_id: string;
  body: string;
  like_count: number;
  reply_count: number;
  is_edited: boolean;
  created_at_iso: string;
  author: CommentRowAuthor;
}

async function hydrateComment(commentId: string): Promise<HydratedComment> {
  const [row] = await sql<[HydratedComment]>`
    SELECT
      c.id, c.post_id, c.body, c.like_count, c.reply_count, c.is_edited,
      (to_json(c.created_at) #>> '{}') AS created_at_iso,
      jsonb_build_object(
        'id', u.id, 'username', u.username, 'display_name', u.display_name,
        'avatar_url', u.avatar_url, 'role', u.role, 'is_verified', u.is_verified
      ) AS author
    FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.id = ${commentId}::uuid
  `;
  return row;
}

export async function findByClientToken(
  authorId: string,
  clientToken: string,
): Promise<HydratedComment | null> {
  const [row] = await sql<[{ id: string }?]>`
    SELECT id FROM comments WHERE author_id = ${authorId}::uuid AND client_token = ${clientToken}
  `;
  return row ? hydrateComment(row.id) : null;
}

export interface InsertCommentParams {
  postId: string;
  authorId: string;
  parentCommentId: string | null;
  body: string;
  clientToken: string | null;
}

// Gates the insert on post visibility in the same statement (WHERE EXISTS) rather
// than a separate pre-check — zero rows returned means the post is missing or
// deleted. The Part 5 comment_guard trigger derives depth/root_comment_id and
// raises 23503/23514 for a bad parent; those propagate up to the caller untouched.
export async function insertComment(params: InsertCommentParams): Promise<string | null> {
  const [row] = await sql<[{ id: string }?]>`
    INSERT INTO comments (post_id, author_id, parent_comment_id, body, client_token)
    SELECT
      ${params.postId}::uuid, ${params.authorId}::uuid, ${params.parentCommentId}::uuid,
      ${params.body}, ${params.clientToken}
    WHERE EXISTS (
      SELECT 1 FROM posts
      WHERE id = ${params.postId}::uuid AND deleted_at IS NULL AND status = 'active'
    )
    RETURNING id
  `;
  return row ? row.id : null;
}

export { hydrateComment };

export async function getPostCommentCount(postId: string): Promise<number> {
  const [row] = await sql<[{ comment_count: number }]>`
    SELECT comment_count FROM posts WHERE id = ${postId}::uuid
  `;
  return row.comment_count;
}
