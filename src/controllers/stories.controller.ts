import type { Request, Response } from 'express';
import { getStoriesRail } from '../services/stories.service.js';
import { ok } from '../utils/envelope.js';

export async function getStories(req: Request, res: Response): Promise<void> {
  const rail = await getStoriesRail(req.user.id);
  res.json(ok(rail, String(req.id)));
}
