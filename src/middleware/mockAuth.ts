import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

// Auth is out of scope for this build. This is the single seam that becomes real JWT
// verification later: swap the body of this function for a token check, keep the
// same req.user shape, and nothing downstream needs to change.
//
// No database lookup here — the feed only needs the id, and loading the user row on
// every request would be a wasted round trip on the hot path. GET /me (Part 12) does
// the lookup when it actually needs the row.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function mockAuth(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.header('X-User-Id');
  req.user = { id: isUuid(raw) ? raw : env.MOCK_USER_ID };
  next();
}
