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

    // Assign the parsed result back so downstream code gets coerced types. Express 5
    // made req.query a getter-only accessor (parsed lazily from the URL), so a plain
    // assignment throws "Cannot set property query ... which has only a getter" —
    // redefine the property instead. body/params are still plain writable properties.
    if (target === 'query') {
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req[target] = result.data;
    }
    next();
  };
}
