import {
  postIsVisible,
  selectComments,
  insertComment,
  findByClientToken,
  hydrateComment,
  getPostCommentCount,
  type CommentRow,
} from '../repositories/comments.repo.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';
import { mapCommentRow, mapHydratedComment, type CommentDto } from '../mappers/comment.mapper.js';
import { AppError, NotFoundError, ValidationError } from '../errors/AppError.js';
import type { CommentQuery, CreateCommentBody } from '../schemas/comment.schema.js';

export interface CommentListResult {
  items: CommentDto[];
  hasMore: boolean;
  nextCursor: string | null;
}

export async function listComments(
  postId: string,
  query: CommentQuery,
  viewerId: string,
): Promise<CommentListResult> {
  // A GET against a nonexistent post must be a 404, not an empty array — "no
  // comments" and "no such post" are different facts the client renders
  // differently. get_post_comments doesn't validate the post itself, so this is a
  // deliberate second query, not an oversight.
  if (!(await postIsVisible(postId))) {
    throw new NotFoundError('POST_NOT_FOUND', 'That post could not be found.');
  }

  const cursor = query.cursor ? decodeCursor(query.cursor) : null;

  const rows = await selectComments({
    postId,
    limit: query.limit + 1,
    cursorTs: cursor?.ts ?? null,
    cursorId: cursor?.id ?? null,
    sort: query.sort,
  });

  const hasMore = rows.length > query.limit;
  const page: CommentRow[] = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page[page.length - 1];

  const nextCursor =
    hasMore && last ? encodeCursor({ ts: last.created_at_iso, id: last.id }) : null;

  return {
    items: page.map((row) => mapCommentRow(row, viewerId)),
    hasMore,
    nextCursor,
  };
}

interface PgLikeError {
  code: string;
  message?: unknown;
}

function isPgLikeError(err: unknown): err is PgLikeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  );
}

export interface CreateCommentResult {
  comment: CommentDto;
  postCommentCount: number;
}

export async function createComment(
  postId: string,
  authorId: string,
  body: CreateCommentBody,
  viewerId: string,
): Promise<CreateCommentResult> {
  const parentCommentId = body.parent_comment_id ?? null;
  const clientToken = body.client_token ?? null;

  if (clientToken) {
    const existing = await findByClientToken(authorId, clientToken);
    if (existing) {
      const postCommentCount = await getPostCommentCount(postId);
      return { comment: mapHydratedComment(existing, viewerId), postCommentCount };
    }
  }

  let commentId: string | null;
  try {
    commentId = await insertComment({
      postId,
      authorId,
      parentCommentId,
      body: body.body,
      clientToken,
    });
  } catch (err) {
    if (isPgLikeError(err)) {
      if (err.code === '23503') {
        throw new NotFoundError('PARENT_COMMENT_NOT_FOUND', 'That comment could not be found.');
      }
      if (err.code === '23514') {
        const message = typeof err.message === 'string' ? err.message : '';
        if (message.includes('maximum reply depth is one level')) {
          throw new AppError(409, 'MAX_REPLY_DEPTH', 'You can only reply one level deep.', false);
        }
        if (message.includes('parent comment belongs to a different post')) {
          throw new ValidationError('Request validation failed.', [
            { field: 'parent_comment_id', message: 'Parent comment belongs to a different post.' },
          ]);
        }
        // Backstop for the body CHECK constraint — zod should already have
        // rejected this, so reaching here means the schema and the database
        // constraint have drifted apart.
        throw new ValidationError('Request validation failed.', [
          { field: 'body', message: 'That comment is not valid.' },
        ]);
      }
      // Race on client_token: two concurrent requests with the same token can
      // both pass the check above. One insert wins, the other hits the partial
      // unique index. A retry should look like a success, not a 409.
      if (err.code === '23505' && clientToken) {
        const winner = await findByClientToken(authorId, clientToken);
        if (winner) {
          const postCommentCount = await getPostCommentCount(postId);
          return { comment: mapHydratedComment(winner, viewerId), postCommentCount };
        }
      }
    }
    throw err;
  }

  if (!commentId) {
    throw new NotFoundError('POST_NOT_FOUND', 'That post could not be found.');
  }

  // A separate query, deliberately: the comment_count trigger fires AFTER INSERT,
  // and reading posts in the same statement as the insert would see the
  // pre-trigger snapshot. This is the only way to get the true post-write value.
  const [comment, postCommentCount] = await Promise.all([
    hydrateComment(commentId),
    getPostCommentCount(postId),
  ]);

  return { comment: mapHydratedComment(comment, viewerId), postCommentCount };
}
