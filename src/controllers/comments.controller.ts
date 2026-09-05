import type { Request, Response } from 'express';
import { listComments, createComment } from '../services/comment.service.js';
import { ok, page } from '../utils/envelope.js';
import type { CommentParams, CommentQuery, CreateCommentBody } from '../schemas/comment.schema.js';

export async function getComments(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as CommentParams;
  const query = req.query as unknown as CommentQuery;

  const result = await listComments(id, query, req.user.id);

  res.json(
    page(
      result.items,
      { next_cursor: result.nextCursor, has_more: result.hasMore, limit: query.limit },
      String(req.id),
    ),
  );
}

export async function postComment(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as CommentParams;
  const body = req.body as CreateCommentBody;

  const result = await createComment(id, req.user.id, body, req.user.id);

  res.status(201).json(
    ok({ comment: result.comment, post_comment_count: result.postCommentCount }, String(req.id)),
  );
}
