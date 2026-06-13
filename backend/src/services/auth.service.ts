import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
} from '../lib/jwt';
import { AppError } from '../middlewares/error.middleware';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema';

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
