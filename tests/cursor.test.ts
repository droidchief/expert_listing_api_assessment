import { describe, expect, it } from 'vitest';
import { encodeCursor, decodeCursor } from '../src/utils/cursor.js';
import { InvalidCursorError } from '../src/errors/AppError.js';

const VALID_ID = '11dabec2-e4e3-4e96-863d-6018b8cf9d52';

describe('cursor', () => {
  it('round-trips ts and id, preserving microsecond precision', () => {
    const ts = '2026-09-05T10:00:00.519166+00:00';
    const encoded = encodeCursor({ ts, id: VALID_ID });
    const decoded = decodeCursor(encoded);
    expect(decoded.ts).toBe(ts);
    expect(decoded.id).toBe(VALID_ID);
  });

  it('throws InvalidCursorError on malformed base64', () => {
    expect(() => decodeCursor('!!!not-base64!!!')).toThrow(InvalidCursorError);
  });

  it('throws InvalidCursorError on invalid JSON', () => {
    const raw = Buffer.from('not json', 'utf8').toString('base64url');
    expect(() => decodeCursor(raw)).toThrow(InvalidCursorError);
  });

  it('throws InvalidCursorError on missing ts', () => {
    const raw = Buffer.from(JSON.stringify({ id: VALID_ID }), 'utf8').toString('base64url');
    expect(() => decodeCursor(raw)).toThrow(InvalidCursorError);
  });

  it('throws InvalidCursorError on missing id', () => {
    const raw = Buffer.from(JSON.stringify({ ts: '2026-09-05T10:00:00.000Z' }), 'utf8').toString(
      'base64url',
    );
    expect(() => decodeCursor(raw)).toThrow(InvalidCursorError);
  });

  it('throws InvalidCursorError on an unparseable date', () => {
    const raw = Buffer.from(
      JSON.stringify({ ts: 'not-a-date', id: VALID_ID }),
      'utf8',
    ).toString('base64url');
    expect(() => decodeCursor(raw)).toThrow(InvalidCursorError);
  });

  it('throws InvalidCursorError on a non-uuid id', () => {
    const raw = Buffer.from(
      JSON.stringify({ ts: '2026-09-05T10:00:00.000Z', id: 'not-a-uuid' }),
      'utf8',
    ).toString('base64url');
    expect(() => decodeCursor(raw)).toThrow(InvalidCursorError);
  });
});
