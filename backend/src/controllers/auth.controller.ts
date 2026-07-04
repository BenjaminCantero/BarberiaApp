import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
};

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ message: 'Usuario registrado exitosamente', user });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ message: 'Refresh token requerido' });
      return;
    }

    const { accessToken, refreshToken } = await authService.refresh(token);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await authService.logout(token);
    res.clearCookie('refreshToken');
    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body.email);
    // Respuesta genérica para no revelar si el email está registrado.
    res.json({ message: 'Si el email existe, te enviamos un enlace para restablecer tu contraseña.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.verifyEmail(req.body.token);
    res.json({ message: 'Email verificado correctamente.' });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resendVerification(req.body.email);
    res.json({ message: 'Si el email existe y no está verificado, te enviamos un nuevo enlace.' });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, emailVerified: true },
    });
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}
