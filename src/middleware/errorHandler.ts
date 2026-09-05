import type { NextFunction, Request, Response } from 'express';
import { AppError, InternalError, ValidationError, pgErrorMap } from '../errors/index.js';
import { logger } from '../utils/logger.js';

// body-parser's express.json() throws a plain SyntaxError (with statusCode 400) for
// malformed JSON, not an AppError — without this it falls through to a 500.
function isMalformedJsonError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    'statusCode' in err &&
    (err as { statusCode?: unknown }).statusCode === 400
  );
}

// The only place an error response is formatted.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = err instanceof AppError
    ? err
    : isMalformedJsonError(err)
      ? new ValidationError('That request body is not valid JSON.')
      : (pgErrorMap(err) ?? new InternalError());

  const logPayload = {
    request_id: req.id,
    method: req.method,
    path: req.path,
    user_id: req.user?.id,
    err,
  };

  if (appError.status >= 500) {
    logger.error(logPayload, 'request failed');
  } else {
    logger.warn(logPayload, 'request failed');
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.fieldErrors ? { field_errors: appError.fieldErrors } : {}),
      retryable: appError.retryable,
    },
    meta: { request_id: req.id, server_time: new Date().toISOString() },
  });
}
