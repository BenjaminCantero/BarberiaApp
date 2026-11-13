import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token de acceso requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, role: true, isActive: true } });
    if (!user?.isActive) {
      res.status(401).json({ message: 'Cuenta desactivada o inexistente' });
      return;
    }
    req.user = { userId: user.id, role: user.role };
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }
    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({ message: 'Sin permisos suficientes' });
      return;
    }
    next();
  };
}
