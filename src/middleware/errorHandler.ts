import type { NextFunction, Request, Response } from 'express';
import { AppError, InternalError, pgErrorMap } from '../errors/index.js';
import { logger } from '../utils/logger.js';

// The only place an error response is formatted.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError =
    err instanceof AppError ? err : (pgErrorMap(err) ?? new InternalError());

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
