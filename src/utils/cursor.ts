import { InvalidCursorError } from '../errors/AppError.js';

export interface CursorInput {
  // A precise ISO-8601 string, not a Date — a JS Date only has millisecond
  // precision, but Postgres timestamptz carries microseconds. Two rows can share
  // the same millisecond and differ only in the microseconds, and round-tripping
  // through a Date would silently truncate that, corrupting the keyset comparison
  // at exact tie boundaries (a page skips or repeats a row a few pages in).
  ts: string;
  id: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(input: CursorInput): string {
  const payload = JSON.stringify({ ts: input.ts, id: input.id });
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

  // Validated for parseability only — the original string is kept as-is so its
  // precision survives untouched.
  if (Number.isNaN(new Date(ts).getTime())) {
    throw new InvalidCursorError();
  }

  if (!UUID_RE.test(id)) {
    throw new InvalidCursorError();
  }

  return { ts, id };
}
