import type { Request, Response } from 'express';
import { getMe } from '../services/me.service.js';
import { ok } from '../utils/envelope.js';

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const me = await getMe(req.user.id);
  res.json(ok(me, String(req.id)));
}
