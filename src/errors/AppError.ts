export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly fieldErrors?: FieldError[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: FieldError[]) {
    super(400, 'VALIDATION_ERROR', message, false, fieldErrors);
  }
}

export class InvalidCursorError extends AppError {
  constructor(message = 'That page link is invalid or has expired.') {
    super(400, 'INVALID_CURSOR', message, false);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do that.') {
    super(403, 'FORBIDDEN', message, false);
  }
}

export class NotFoundError extends AppError {
  constructor(code = 'NOT_FOUND', message = 'That resource could not be found.') {
    super(404, code, message, false);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'That conflicts with an existing resource.') {
    super(409, 'CONFLICT', message, false);
  }
}

export class UnprocessableError extends AppError {
  constructor(message = 'That request could not be processed.') {
    super(422, 'UNPROCESSABLE', message, false);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again shortly.') {
    super(429, 'RATE_LIMIT', message, true);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Something went wrong. Please try again.') {
    super(500, 'INTERNAL_ERROR', message, true);
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(message = 'The service is temporarily unavailable. Please try again.') {
    super(503, 'DATABASE_UNAVAILABLE', message, true);
  }
}
