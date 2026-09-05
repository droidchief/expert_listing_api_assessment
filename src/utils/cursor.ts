import { InvalidCursorError } from '../errors/AppError.js';

export interface CursorInput {
  ts: Date;
  id: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(input: CursorInput): string {
  const payload = JSON.stringify({ ts: input.ts.toISOString(), id: input.id });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

// A malformed cursor must never silently fall back to page 1 — that presents as
// mysterious duplicated content three screens down and is miserable to diagnose.
export function decodeCursor(raw: string): CursorInput {
  let json: string;
  try {
    json = Buffer.from(raw, 'base64url').toString('utf8');
  } catch {
    throw new InvalidCursorError();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidCursorError();
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new InvalidCursorError();
  }

  const { ts, id } = parsed as Record<string, unknown>;

  if (typeof ts !== 'string' || typeof id !== 'string') {
    throw new InvalidCursorError();
  }

  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    throw new InvalidCursorError();
  }

  if (!UUID_RE.test(id)) {
    throw new InvalidCursorError();
  }

  return { ts: date, id };
}
