import type { Request, Response } from 'express';
import { getFeed } from '../services/feed.service.js';
import { page } from '../utils/envelope.js';
import type { FeedQuery } from '../schemas/feed.schema.js';

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
