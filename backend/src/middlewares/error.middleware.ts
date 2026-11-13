import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Errores de subida (tamaño excedido, tipo de archivo no permitido)
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo es demasiado grande' : 'Archivo inválido';
    res.status(400).json({ message });
    return;
  }
  if (err.message?.startsWith('Solo se permiten')) {
    res.status(400).json({ message: err.message });
    return;
  }

  console.error('[Error]', err);
  res.status(500).json({ message: 'Error interno del servidor' });
}
