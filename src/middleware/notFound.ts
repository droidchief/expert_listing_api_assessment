import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../errors/AppError.js';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError('ROUTE_NOT_FOUND', 'That endpoint does not exist.'));
}
