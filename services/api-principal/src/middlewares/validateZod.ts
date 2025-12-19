import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type ValidationDetail = {
  path: string;
  message: string;
};

/**
 * Validate and sanitize req.body using a Zod schema.
 * - Coercions/transforms defined in the schema will be applied.
 * - Unknown fields can be rejected by using `.strict()` on the schema.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      const details: ValidationDetail[] = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'body',
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation error',
        details,
      });
      return;
    }

    req.body = parsed.data;
    next();
  };
}
