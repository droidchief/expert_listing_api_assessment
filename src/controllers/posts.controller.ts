import type { Request, Response } from 'express';
import { getFeed } from '../services/feed.service.js';
import { createPostFromBody } from '../services/create-post.service.js';
import { ok, page } from '../utils/envelope.js';
import type { FeedQuery } from '../schemas/feed.schema.js';
import type { CreatePostBody } from '../schemas/create-post.schema.js';

export async function listPosts(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as FeedQuery;
  const result = await getFeed(query, req.user.id);

  res.json(
    page(
      result.items,
      { next_cursor: result.nextCursor, has_more: result.hasMore, limit: query.limit },
      String(req.id),
    ),
  );
}

export async function createPostHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as CreatePostBody;
  const created = await createPostFromBody(req.user.id, body);
  res.status(201).json(ok(created, String(req.id)));
}
