import { prisma } from '../lib/prisma';
import { generateCandidateSlots, rangesOverlap } from '../lib/time';

interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
  startAt: string;   // ISO datetime
  endAt: string;     // ISO datetime
}

function buildDatetime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

export async function getAvailableSlots(
  barberId: string,
  date: string,
  serviceId?: string,
): Promise<TimeSlot[]> {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();

  const schedule = await prisma.schedule.findFirst({
    where: { barberId, dayOfWeek, isActive: true },
  });

  if (!schedule) return [];

  let durationMin = 30;
  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId, isActive: true },
    });
    if (service) durationMin = service.durationMin;
  }

  // Generar todos los slots posibles en el día (paso de 30 min, reservando
  // la duración real del servicio para cada slot).
  const possibleSlots: TimeSlot[] = generateCandidateSlots(
    schedule.startTime,
    schedule.endTime,
    durationMin,
    30,
  ).map((s) => ({
    startTime: s.startTime,
    endTime: s.endTime,
    startAt: buildDatetime(date, s.startTime).toISOString(),
    endAt: buildDatetime(date, s.endTime).toISOString(),
  }));

  // Obtener citas existentes del día (PENDING o CONFIRMED)
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startAt: { gte: dayStart, lte: dayEnd },
    },
    select: { startAt: true, endAt: true },
  });

  const now = new Date();

  return possibleSlots.filter((slot) => {
    const slotStart = new Date(slot.startAt);
    const slotEnd = new Date(slot.endAt);

    // Descartar slots pasados
    if (slotStart <= now) return false;

    // Descartar si colisiona con alguna cita existente
    return !appointments.some((appt) =>
      rangesOverlap(appt.startAt, appt.endAt, slotStart, slotEnd),
    );
  });
}
