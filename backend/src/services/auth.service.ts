import bcrypt from 'bcryptjs';
import { TokenType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
} from '../lib/jwt';
import { generateToken, hashToken } from '../lib/token';
import * as notifications from './notification.service';
import { AppError } from '../middlewares/error.middleware';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hora
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

function frontendUrl(): string {
  return (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

/** Crea y persiste un token de un solo uso; devuelve el token en claro. */
async function issueToken(userId: string, type: TokenType, ttlMs: number): Promise<string> {
  // Invalidamos tokens previos del mismo tipo para que solo el último sea válido.
  await prisma.verificationToken.deleteMany({ where: { userId, type, usedAt: null } });
  const { token, tokenHash } = generateToken();
  await prisma.verificationToken.create({
    data: { userId, tokenHash, type, expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

async function sendVerificationEmail(user: { id: string; name: string; email: string }): Promise<void> {
  const token = await issueToken(user.id, TokenType.EMAIL_VERIFICATION, EMAIL_VERIFICATION_TTL_MS);
  const url = `${frontendUrl()}/verify-email?token=${token}`;
  await notifications.sendEmailVerificationEmail(user.email, user.name, url);
}

export async function register(data: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new AppError(409, 'El email ya está registrado');

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      phone: data.phone,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  // Enviamos el email de verificación sin bloquear el registro si el envío falla.
  sendVerificationEmail(user).catch(() => undefined);

  return user;
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new AppError(401, 'Credenciales inválidas');

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Credenciales inválidas');

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await saveRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function refresh(token: string) {
  const isValid = await isRefreshTokenValid(token);
  if (!isValid) throw new AppError(401, 'Refresh token inválido o expirado');

  let payload: { userId: string; role: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    await revokeRefreshToken(token);
    throw new AppError(401, 'Refresh token inválido');
  }

  await revokeRefreshToken(token);

  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);
  await saveRefreshToken(payload.userId, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  await revokeRefreshToken(token);
}

/**
 * Inicia el flujo de recuperación de contraseña. Siempre resuelve sin revelar
 * si el email existe (evita enumeración de cuentas).
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isActive: true },
  });
  if (!user || !user.isActive) return;

  const token = await issueToken(user.id, TokenType.PASSWORD_RESET, PASSWORD_RESET_TTL_MS);
  const url = `${frontendUrl()}/reset-password?token=${token}`;
  await notifications.sendPasswordResetEmail(user.email, user.name, url);
}

/** Consume un token de reseteo y actualiza la contraseña. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !record ||
    record.type !== TokenType.PASSWORD_RESET ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    throw new AppError(400, 'El enlace no es válido o expiró. Solicitá uno nuevo.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Cerramos todas las sesiones activas por seguridad.
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ]);
}

/** Consume un token de verificación y marca el email como confirmado. */
export async function verifyEmail(token: string): Promise<void> {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !record ||
    record.type !== TokenType.EMAIL_VERIFICATION ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    throw new AppError(400, 'El enlace no es válido o expiró. Pedí uno nuevo.');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}

/** Reenvía el email de verificación. No revela si el email existe. */
export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true, isActive: true },
  });
  if (!user || !user.isActive || user.emailVerified) return;
  await sendVerificationEmail(user);
}
