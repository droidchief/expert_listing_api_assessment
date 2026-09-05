import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  InvalidCursorError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  RateLimitError,
  InternalError,
  DatabaseUnavailableError,
} from '../src/errors/AppError.js';

describe('AppError subclasses', () => {
  it.each([
    ['ValidationError', new ValidationError('msg'), 400, false],
    ['InvalidCursorError', new InvalidCursorError(), 400, false],
    ['ForbiddenError', new ForbiddenError(), 403, false],
    ['NotFoundError', new NotFoundError(), 404, false],
    ['ConflictError', new ConflictError(), 409, false],
    ['UnprocessableError', new UnprocessableError(), 422, false],
    ['RateLimitError', new RateLimitError(), 429, true],
    ['InternalError', new InternalError(), 500, true],
    ['DatabaseUnavailableError', new DatabaseUnavailableError(), 503, true],
  ] as const)('%s carries status %i and retryable %s', (_name, err, status, retryable) => {
    expect(err.status).toBe(status);
    expect(err.retryable).toBe(retryable);
  });
});
