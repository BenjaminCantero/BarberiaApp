import { prisma } from '../lib/prisma';
import * as notifications from '../services/notification.service';

const REMINDER_SELECT = {
  id: true,
  startAt: true,
  client: { select: { name: true, email: true } },
  barber: { select: { user: { select: { name: true, email: true } } } },
  service: { select: { name: true } },
};

/**
 * Envía recordatorios a las citas CONFIRMED que comienzan dentro de las
 * próximas `windowHours` horas y que todavía no recibieron recordatorio.
 * Marca `reminderSentAt` para no duplicar envíos.
 */
export async function runReminderSweep(windowHours = 24): Promise<number> {
  const now = new Date();
  const until = new Date(now.getTime() + windowHours * 3_600_000);

  const pending = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSentAt: null,
      startAt: { gte: now, lte: until },
    },
    select: REMINDER_SELECT,
  });

  let sent = 0;
  for (const appt of pending) {
    try {
      await notifications.notifyAppointmentReminder(appt);
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });
      sent += 1;
    } catch (err) {
      console.error(`[reminder] fallo enviando recordatorio para cita ${appt.id}`, err);
    }
  }
  return sent;
}

let timer: NodeJS.Timeout | null = null;

/** Arranca el barrido periódico de recordatorios (por defecto cada hora). */
export function startReminderJob(intervalMs = 60 * 60 * 1000): void {
  if (timer) return;
  // Primer barrido al arrancar y luego en intervalos.
  runReminderSweep().catch((err) => console.error('[reminder] error en barrido inicial', err));
  timer = setInterval(() => {
    runReminderSweep().catch((err) => console.error('[reminder] error en barrido', err));
  }, intervalMs);
  // No mantener vivo el proceso solo por este timer.
  timer.unref?.();
}
