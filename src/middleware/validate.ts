import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError, type FieldError } from '../errors/AppError.js';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodType, target: Target) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const fieldErrors: FieldError[] = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || target,
        message: issue.message,
      }));
      throw new ValidationError('Request validation failed.', fieldErrors);
    }

    // Assign the parsed result back so downstream code gets coerced types.
    req[target] = result.data;
    next();
  };
}
