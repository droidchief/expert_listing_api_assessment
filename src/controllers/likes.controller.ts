import type { Request, Response } from 'express';
import { toggleLike } from '../services/like.service.js';
import { ok } from '../utils/envelope.js';
import type { LikeBody, LikeParams } from '../schemas/like.schema.js';

// No liked_by_preview here: toggle_post_like returns only (liked, like_count), so
// including the facepile would mean a second query on a hot, high-frequency
// endpoint. The client already knows its own username/avatar and can add or remove
// itself from the facepile locally, reconciling against like_count on the next feed
// load — a deliberate omission, not an oversight.
export async function likePost(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as LikeParams;
  const { action } = req.body as LikeBody;

  const result = await toggleLike(id, req.user.id, action);

  res.json(ok(result, String(req.id)));
}
