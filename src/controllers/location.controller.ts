import type { Request, Response } from 'express';
import { listLocations } from '../services/location.service.js';
import { ok } from '../utils/envelope.js';
import type { LocationQuery } from '../schemas/location.schema.js';

export async function getLocations(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as LocationQuery;
  const locations = await listLocations(query);
  res.json(ok(locations, String(req.id)));
}
