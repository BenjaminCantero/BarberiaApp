import { prisma } from '../lib/prisma';

interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
  startAt: string;   // ISO datetime
  endAt: string;     // ISO datetime
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
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

  // Generar todos los slots posibles en el día
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
  const possibleSlots: TimeSlot[] = [];

  for (let m = startMinutes; m + durationMin <= endMinutes; m += 30) {
    possibleSlots.push({
      startTime: minutesToTime(m),
      endTime: minutesToTime(m + durationMin),
      startAt: buildDatetime(date, minutesToTime(m)).toISOString(),
      endAt: buildDatetime(date, minutesToTime(m + durationMin)).toISOString(),
    });
  }

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
    return !appointments.some(
      (appt) => appt.startAt < slotEnd && appt.endAt > slotStart,
    );
  });
}
