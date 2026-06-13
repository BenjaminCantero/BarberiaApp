import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({ body: req.body, query: req.query, params: req.params });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          message: 'Datos inválidos',
          errors: err.errors.map((e) => ({
            field: e.path.slice(1).join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
