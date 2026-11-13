import type { PortfolioStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { deleteUpload } from '../lib/storage';

export const MAX_PHOTOS_PER_BARBER = 30;
const MAX_PUBLIC_LIMIT = 48;

const barberSummary = {
  select: { id: true, user: { select: { name: true, avatarUrl: true } } },
} as const;

/** Fotos visibles al público: solo aprobadas y de barberos activos. */
export async function listPublicPortfolio(opts: { barberId?: string; limit?: number } = {}) {
  const take = Math.min(Math.max(opts.limit ?? 24, 1), MAX_PUBLIC_LIMIT);
  return prisma.portfolioPhoto.findMany({
    where: {
      status: 'APPROVED',
      ...(opts.barberId ? { barberId: opts.barberId } : {}),
      barber: { isActive: true },
    },
    orderBy: { createdAt: 'desc' },
    take,
    include: { barber: barberSummary },
  });
}

/** Todas las fotos de un barbero (para su panel), con estado. */
export async function listBarberPortfolio(barberId: string) {
  return prisma.portfolioPhoto.findMany({
    where: { barberId },
    orderBy: { createdAt: 'desc' },
  });
}

/** Cola de moderación del admin. */
export async function listPortfolioForReview(status?: PortfolioStatus) {
  return prisma.portfolioPhoto.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { barber: barberSummary },
  });
}

export async function createPortfolioPhoto(input: {
  barberId: string;
  imageUrl: string;
  caption?: string;
  autoApprove: boolean;
}) {
  const count = await prisma.portfolioPhoto.count({ where: { barberId: input.barberId } });
  if (count >= MAX_PHOTOS_PER_BARBER) {
    throw new AppError(400, `Límite alcanzado: máximo ${MAX_PHOTOS_PER_BARBER} fotos por barbero`);
  }

  const caption = input.caption?.trim().slice(0, 120) || null;
  return prisma.portfolioPhoto.create({
    data: {
      barberId: input.barberId,
      imageUrl: input.imageUrl,
      caption,
      status: input.autoApprove ? 'APPROVED' : 'PENDING',
      ...(input.autoApprove ? { reviewedAt: new Date() } : {}),
    },
  });
}

/**
 * Borra una foto. `barberId` null = admin (puede borrar cualquiera).
 */
export async function deletePortfolioPhoto(photoId: string, barberId: string | null) {
  const photo = await prisma.portfolioPhoto.findUnique({ where: { id: photoId } });
  if (!photo) throw new AppError(404, 'Foto no encontrada');
  if (barberId !== null && photo.barberId !== barberId) {
    throw new AppError(403, 'Sin permisos para eliminar esta foto');
  }
  await prisma.portfolioPhoto.delete({ where: { id: photoId } });
  await deleteUpload(photo.imageUrl);
}

export async function reviewPortfolioPhoto(photoId: string, status: 'APPROVED' | 'REJECTED') {
  const photo = await prisma.portfolioPhoto.findUnique({ where: { id: photoId } });
  if (!photo) throw new AppError(404, 'Foto no encontrada');
  return prisma.portfolioPhoto.update({
    where: { id: photoId },
    data: { status, reviewedAt: new Date() },
  });
}
