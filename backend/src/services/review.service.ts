import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

const REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  client: { select: { name: true, avatarUrl: true } },
} as const;

/**
 * Un cliente deja una reseña sobre una cita COMPLETADA suya. Solo se permite
 * una reseña por cita (garantizado además por el índice único en appointmentId).
 */
export async function createReview(
  clientId: string,
  appointmentId: string,
  rating: number,
  comment?: string,
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, clientId: true, barberId: true, status: true, review: { select: { id: true } } },
  });

  if (!appointment) throw new AppError(404, 'Cita no encontrada');
  if (appointment.clientId !== clientId) {
    throw new AppError(403, 'Solo podés reseñar tus propias citas');
  }
  if (appointment.status !== 'COMPLETED') {
    throw new AppError(400, 'Solo podés reseñar citas completadas');
  }
  if (appointment.review) {
    throw new AppError(409, 'Ya dejaste una reseña para esta cita');
  }

  return prisma.review.create({
    data: { appointmentId, clientId, barberId: appointment.barberId, rating, comment },
    select: REVIEW_SELECT,
  });
}

/** Lista pública de reseñas de un barbero + resumen (promedio y total). */
export async function getBarberReviews(barberId: string) {
  const [reviews, summary] = await Promise.all([
    prisma.review.findMany({
      where: { barberId },
      select: REVIEW_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
    getRatingSummary(barberId),
  ]);
  return { summary, reviews };
}

/** Promedio y cantidad de reseñas de un barbero. */
export async function getRatingSummary(barberId: string): Promise<{ average: number; count: number }> {
  const agg = await prisma.review.aggregate({
    where: { barberId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return {
    average: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : 0,
    count: agg._count.rating,
  };
}

/**
 * Devuelve un mapa barberId -> resumen de rating para una lista de barberos,
 * en una sola consulta (evita N+1 al listar barberos).
 */
export async function getRatingSummaries(
  barberIds: string[],
): Promise<Map<string, { average: number; count: number }>> {
  if (barberIds.length === 0) return new Map();
  const grouped = await prisma.review.groupBy({
    by: ['barberId'],
    where: { barberId: { in: barberIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(
    grouped.map((g) => [
      g.barberId,
      {
        average: g._avg.rating ? Number(g._avg.rating.toFixed(1)) : 0,
        count: g._count.rating,
      },
    ]),
  );
}
