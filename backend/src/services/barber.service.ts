import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import type { UpdateBarberInput, SetScheduleInput, CreateBlockInput } from '../schemas/barber.schema';
import { validateDayRanges } from '../lib/time';
import { getZonedDateStr, zonedDayRange, zonedWallTimeToUtc } from '../lib/timezone';
import { getAvailableSlots } from './availability.service';
import { getRatingSummary, getRatingSummaries } from './review.service';
import { normalizeInstagram } from '../lib/instagram';

export async function getMyBarber(userId: string) {
  const barber = await prisma.barber.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, phone: true, avatarUrl: true } },
      services: {
        include: { service: true },
        where: { service: { isActive: true } },
      },
      schedules: { where: { isActive: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    },
  });
  if (!barber) throw new AppError(404, 'Perfil de barbero no encontrado');
  return barber;
}

export async function listBarbers() {
  const barbers = await prisma.barber.findMany({
    where: { isActive: true },
    include: {
      user: { select: { name: true, email: true, phone: true, avatarUrl: true } },
      services: {
        include: { service: true },
        where: { service: { isActive: true } },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const ratings = await getRatingSummaries(barbers.map((b) => b.id));
  return barbers.map((b) => ({ ...b, rating: ratings.get(b.id) ?? { average: 0, count: 0 } }));
}

export async function getBarberById(id: string) {
  const barber = await prisma.barber.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true, avatarUrl: true } },
      services: {
        include: { service: true },
        where: { service: { isActive: true } },
      },
      schedules: { where: { isActive: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    },
  });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');
  const rating = await getRatingSummary(barber.id);
  return { ...barber, rating };
}

export async function updateBarber(id: string, requesterId: string, requesterRole: string, data: UpdateBarberInput) {
  const barber = await prisma.barber.findUnique({ where: { id } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  // Solo el propio barbero o un admin pueden editar
  if (requesterRole !== 'ADMIN' && barber.userId !== requesterId) {
    throw new AppError(403, 'Sin permisos para editar este barbero');
  }

  return prisma.barber.update({
    where: { id },
    data: {
      isActive: data.isActive,
      bio: data.bio === undefined ? undefined : data.bio.trim() || null,
      instagram: normalizeInstagram(data.instagram),
    },
  });
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Carga el barbero y verifica que quien pide sea su dueño o un admin. */
async function getOwnedBarber(barberId: string, requesterId: string, requesterRole: string, action: string) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');
  if (requesterRole !== 'ADMIN' && barber.userId !== requesterId) {
    throw new AppError(403, `Sin permisos para ${action} de este barbero`);
  }
  return barber;
}

export async function setSchedule(barberId: string, requesterId: string, requesterRole: string, input: SetScheduleInput) {
  await getOwnedBarber(barberId, requesterId, requesterRole, 'editar el horario');

  // Validar cada día por separado: tramos con inicio < fin y sin solaparse.
  const active = input.schedule.filter((e) => e.isActive !== false);
  for (let day = 0; day <= 6; day++) {
    const error = validateDayRanges(active.filter((e) => e.dayOfWeek === day));
    if (error) throw new AppError(400, `Horario del ${DAY_NAMES[day]}: ${error}`);
  }

  // Reemplazo atómico: si el insert falla, el horario anterior queda intacto.
  const [, created] = await prisma.$transaction([
    prisma.schedule.deleteMany({ where: { barberId } }),
    prisma.schedule.createMany({
      data: active.map((s) => ({ ...s, isActive: true, barberId })),
    }),
  ]);

  return { count: created.count };
}

export async function listBlocks(
  barberId: string,
  requesterId: string,
  requesterRole: string,
  range: { from?: string; to?: string },
) {
  await getOwnedBarber(barberId, requesterId, requesterRole, 'ver los bloqueos');
  const from = range.from ?? getZonedDateStr(new Date());
  const where: Record<string, unknown> = { barberId, endAt: { gt: zonedDayRange(from).start } };
  if (range.to) where.startAt = { lt: zonedDayRange(range.to).end };
  return prisma.scheduleBlock.findMany({ where, orderBy: { startAt: 'asc' } });
}

export async function createBlock(barberId: string, requesterId: string, requesterRole: string, input: CreateBlockInput) {
  await getOwnedBarber(barberId, requesterId, requesterRole, 'bloquear la agenda');

  let startAt: Date;
  let endAt: Date;
  if (input.startTime && input.endTime) {
    startAt = zonedWallTimeToUtc(input.startDate, input.startTime);
    endAt = zonedWallTimeToUtc(input.startDate, input.endTime);
  } else {
    ({ start: startAt, end: endAt } = zonedDayRange(input.startDate, input.endDate ?? input.startDate));
  }

  if (endAt <= new Date()) throw new AppError(400, 'El bloqueo debe terminar en el futuro');
  if (endAt.getTime() - startAt.getTime() > 366 * 86_400_000) {
    throw new AppError(400, 'Un bloqueo no puede durar más de un año');
  }

  const block = await prisma.scheduleBlock.create({
    data: { barberId, startAt, endAt, reason: input.reason || null },
  });

  // No cancelamos citas automáticamente: avisamos para que el barbero decida.
  const conflicts = await prisma.appointment.count({
    where: {
      barberId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  return { block, conflicts };
}

export async function deleteBlock(barberId: string, blockId: string, requesterId: string, requesterRole: string) {
  await getOwnedBarber(barberId, requesterId, requesterRole, 'editar los bloqueos');
  const { count } = await prisma.scheduleBlock.deleteMany({ where: { id: blockId, barberId } });
  if (count === 0) throw new AppError(404, 'Bloqueo no encontrado');
}

export async function getSchedule(barberId: string) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  return prisma.schedule.findMany({
    where: { barberId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

export async function assignService(barberId: string, serviceId: string, requesterId: string, requesterRole: string) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  if (requesterRole !== 'ADMIN' && barber.userId !== requesterId) {
    throw new AppError(403, 'Sin permisos');
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId, isActive: true } });
  if (!service) throw new AppError(404, 'Servicio no encontrado');

  const existing = await prisma.barberService.findUnique({
    where: { barberId_serviceId: { barberId, serviceId } },
  });
  if (existing) throw new AppError(409, 'El servicio ya está asignado a este barbero');

  return prisma.barberService.create({ data: { barberId, serviceId } });
}

export async function removeService(barberId: string, serviceId: string, requesterId: string, requesterRole: string) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  if (requesterRole !== 'ADMIN' && barber.userId !== requesterId) {
    throw new AppError(403, 'Sin permisos');
  }

  await prisma.barberService.deleteMany({ where: { barberId, serviceId } });
}

export { getAvailableSlots };
