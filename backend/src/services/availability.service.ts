import { prisma } from '../lib/prisma';
import { generateCandidateSlots, rangesOverlap } from '../lib/time';
import { zonedWallTimeToUtc, civilDateDayOfWeek } from '../lib/timezone';

interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
  startAt: string;   // ISO datetime
  endAt: string;     // ISO datetime
}

// Interpreta la hora de pared en la zona de la barbería y devuelve el instante UTC.
function buildDatetime(date: string, time: string): Date {
  return zonedWallTimeToUtc(date, time);
}

export async function getAvailableSlots(
  barberId: string,
  date: string,
  serviceId?: string,
): Promise<TimeSlot[]> {
  const dayOfWeek = civilDateDayOfWeek(date);

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

  // Obtener citas existentes del día (PENDING o CONFIRMED). Los límites del día
  // son la medianoche de la barbería, no la del servidor.
  const dayStart = zonedWallTimeToUtc(date, '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startAt: { gte: dayStart, lt: dayEnd },
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
