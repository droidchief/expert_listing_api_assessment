import { describe, expect, it } from 'vitest';
import { pgErrorMap } from '../src/errors/pgErrorMap.js';

function pgError(code: string) {
  return { code, message: 'boom' };
}

describe('pgErrorMap', () => {
  it('maps 23505 unique_violation to 409', () => {
    const mapped = pgErrorMap(pgError('23505'));
    expect(mapped?.status).toBe(409);
  });

  it('maps 23514 check_violation to 400', () => {
    const mapped = pgErrorMap(pgError('23514'));
    expect(mapped?.status).toBe(400);
  });

  it('maps P0002 to 404', () => {
    const mapped = pgErrorMap(pgError('P0002'));
    expect(mapped?.status).toBe(404);
  });

  it('maps 08006 connection failure to 503 retryable', () => {
    const mapped = pgErrorMap(pgError('08006'));
    expect(mapped?.status).toBe(503);
    expect(mapped?.retryable).toBe(true);
  });

  it('maps an unknown code to 500 retryable', () => {
    const mapped = pgErrorMap(pgError('99999'));
    expect(mapped?.status).toBe(500);
    expect(mapped?.retryable).toBe(true);
  });

  it('returns null for a non-Postgres error', () => {
    expect(pgErrorMap(new Error('plain error'))).toBeNull();
  });
});
