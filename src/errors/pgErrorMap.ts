import {
  AppError,
  ConflictError,
  DatabaseUnavailableError,
  InternalError,
  NotFoundError,
  ValidationError,
} from './AppError.js';

interface PgLikeError {
  code: string;
  message?: unknown;
}

// postgres.js does not export its error classes, so detection is duck-typed on the
// presence of a string `code` property (a Postgres SQLSTATE) rather than instanceof.
function isPgLikeError(err: unknown): err is PgLikeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  );
}

/**
 * Maps a Postgres SQLSTATE to an AppError. Returns null when the error is not a
 * recognised Postgres error, so the caller can fall back to a generic 500.
 */
export function pgErrorMap(err: unknown): AppError | null {
  if (!isPgLikeError(err)) return null;

  switch (err.code) {
    case '23505': // unique_violation
      return new ConflictError('That already exists.');
    case '23503': // foreign_key_violation
      return new NotFoundError('NOT_FOUND', 'A related resource could not be found.');
    case '23514': // check_violation — the domain constraints from Part 3
      return new ValidationError('That request violates a data rule.');
    case '22P02': // invalid_text_representation — bad uuid or enum value
      return new ValidationError('One of the provided values is not valid.');
    case 'P0002': // no_data_found — raised by toggle_post_like for a missing/deleted post
      return new NotFoundError('POST_NOT_FOUND', 'That post could not be found.');
    case '57014': // query_canceled
      return new DatabaseUnavailableError();
    case '08006': // connection_failure
    case '08003': // connection_does_not_exist
      return new DatabaseUnavailableError();
    case '53300': // too_many_connections
      return new DatabaseUnavailableError();
    default:
      return new InternalError();
  }
}
