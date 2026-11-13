import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { fitsInRanges, generateCandidateSlots, rangesOverlap } from '../lib/time';
import {
  zonedWallTimeToUtc,
  civilDateDayOfWeek,
  getZonedDayOfWeek,
  getZonedHHMM,
  zonedDayRange,
} from '../lib/timezone';

interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
  startAt: string;   // ISO datetime
  endAt: string;     // ISO datetime
}

/** Paso entre inicios de slot consecutivos, en minutos. */
const SLOT_STEP_MIN = 30;

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const;

type Db = Prisma.TransactionClient | typeof prisma;

export async function getAvailableSlots(
  barberId: string,
  date: string,
  serviceId?: string,
): Promise<TimeSlot[]> {
  // Validar barbero y servicio para no ofrecer horas que la reserva rechazaría.
  const barber = await prisma.barber.findUnique({ where: { id: barberId }, select: { isActive: true } });
  if (!barber || !barber.isActive) throw new AppError(404, 'Barbero no encontrado o inactivo');

  let durationMin = 30;
  if (serviceId) {
    const offered = await prisma.barberService.findUnique({
      where: { barberId_serviceId: { barberId, serviceId } },
      select: { service: { select: { durationMin: true, isActive: true } } },
    });
    if (!offered || !offered.service.isActive) {
      throw new AppError(404, 'Servicio no disponible para este barbero');
    }
    durationMin = offered.service.durationMin;
  }

  const dayOfWeek = civilDateDayOfWeek(date);

  // Un día puede tener varios tramos (p. ej. 09-13 y 15-19 con pausa de almuerzo).
  const ranges = await prisma.schedule.findMany({
    where: { barberId, dayOfWeek, isActive: true },
    orderBy: { startTime: 'asc' },
  });
  if (ranges.length === 0) return [];

  const possibleSlots: TimeSlot[] = ranges.flatMap((r) =>
    generateCandidateSlots(r.startTime, r.endTime, durationMin, SLOT_STEP_MIN).map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      startAt: zonedWallTimeToUtc(date, s.startTime).toISOString(),
      endAt: zonedWallTimeToUtc(date, s.endTime).toISOString(),
    })),
  );

  // Todo lo que se solape con el día de la barbería (no solo lo que empieza en él).
  const { start: dayStart, end: dayEnd } = zonedDayRange(date);
  const overlapsDay = { startAt: { lt: dayEnd }, endAt: { gt: dayStart } };

  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: { barberId, status: { in: [...ACTIVE_STATUSES] }, ...overlapsDay },
      select: { startAt: true, endAt: true },
    }),
    prisma.scheduleBlock.findMany({
      where: { barberId, ...overlapsDay },
      select: { startAt: true, endAt: true },
    }),
  ]);
  const busy = [...appointments, ...blocks];

  const now = new Date();

  return possibleSlots.filter((slot) => {
    const slotStart = new Date(slot.startAt);
    const slotEnd = new Date(slot.endAt);
    if (slotStart <= now) return false;
    return !busy.some((b) => rangesOverlap(b.startAt, b.endAt, slotStart, slotEnd));
  });
}

/**
 * Lanza 400 si [startAt, endAt) no cae completo dentro de un tramo del horario
 * semanal del barbero (en la zona de la barbería).
 */
export async function assertWithinSchedule(barberId: string, startAt: Date, endAt: Date): Promise<void> {
  const dayOfWeek = getZonedDayOfWeek(startAt);
  const ranges = await prisma.schedule.findMany({
    where: { barberId, dayOfWeek, isActive: true },
    select: { startTime: true, endTime: true },
  });
  if (ranges.length === 0) throw new AppError(400, 'El barbero no trabaja ese día');

  if (!isWithinRanges(ranges, startAt, endAt)) {
    throw new AppError(400, 'El horario solicitado está fuera del turno del barbero');
  }
}

/** true si [startAt, endAt) cae completo dentro de alguno de los tramos (del mismo día). */
export function isWithinRanges(
  ranges: Array<{ startTime: string; endTime: string }>,
  startAt: Date,
  endAt: Date,
): boolean {
  const sameDay = endAt.getTime() - startAt.getTime() < 86_400_000;
  return sameDay && fitsInRanges(ranges, getZonedHHMM(startAt), getZonedHHMM(endAt));
}

/**
 * Lanza 409 si el mismo cliente (por cuenta o email de invitado) ya tiene otra
 * cita activa que se cruza en horario, aunque sea con otro barbero.
 */
export async function assertClientFree(
  db: Db,
  owner: { clientId?: string | null; guestEmail?: string | null },
  startAt: Date,
  endAt: Date,
  excludeAppointmentId?: string,
): Promise<void> {
  const who: Prisma.AppointmentWhereInput[] = [];
  if (owner.clientId) who.push({ clientId: owner.clientId });
  if (owner.guestEmail) who.push({ guestEmail: { equals: owner.guestEmail, mode: 'insensitive' } });
  if (who.length === 0) return;

  const clash = await db.appointment.findFirst({
    where: {
      OR: who,
      status: { in: [...ACTIVE_STATUSES] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw new AppError(409, 'Ya tienes otra cita en ese horario.');
}

/**
 * Lanza 409 si el rango choca con otra cita activa o con un bloqueo del barbero.
 * Pensada para correr dentro de la transacción Serializable que crea/mueve la cita.
 */
export async function assertSlotFree(
  db: Db,
  barberId: string,
  startAt: Date,
  endAt: Date,
  excludeAppointmentId?: string,
): Promise<void> {
  const overlaps = { startAt: { lt: endAt }, endAt: { gt: startAt } };

  const block = await db.scheduleBlock.findFirst({
    where: { barberId, ...overlaps },
    select: { id: true },
  });
  if (block) throw new AppError(409, 'El barbero no atiende en ese horario. Elige otro slot.');

  const collision = await db.appointment.findFirst({
    where: {
      barberId,
      status: { in: [...ACTIVE_STATUSES] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      ...overlaps,
    },
    select: { id: true },
  });
  if (collision) throw new AppError(409, 'El horario ya está ocupado. Elige otro slot.');
}
