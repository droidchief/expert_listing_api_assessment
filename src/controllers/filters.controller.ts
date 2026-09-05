import type { Request, Response } from 'express';
import { getFilterOptions } from '../services/filters.service.js';
import { ok } from '../utils/envelope.js';

export async function getFilterOptionsHandler(req: Request, res: Response): Promise<void> {
  const options = await getFilterOptions();
  res.json(ok(options, String(req.id)));
}
