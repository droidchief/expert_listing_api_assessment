import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

// First in the chain, so even a body-parse failure carries an id.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const existing = req.header('X-Request-Id');
  req.id = existing && existing.length > 0 ? existing : nanoid();
  res.setHeader('X-Request-Id', req.id);
  next();
}
