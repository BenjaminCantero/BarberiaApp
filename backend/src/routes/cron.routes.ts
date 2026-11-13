import { timingSafeEqual } from 'crypto';
import { Router } from 'express';
import { runReminderSweep } from '../jobs/reminder.job';

/**
 * Vercel Cron llama a estas rutas con `Authorization: Bearer <CRON_SECRET>`.
 * Sin CRON_SECRET configurado, las rutas quedan cerradas.
 */
export function isCronAuthorized(header: string | undefined, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

const router = Router();

router.use((req, res, next) => {
  if (!isCronAuthorized(req.headers.authorization, process.env.CRON_SECRET)) {
    res.status(401).json({ message: 'No autorizado' });
    return;
  }
  next();
});

/** Envía los recordatorios de las citas de las próximas 24 h que aún no lo recibieron. */
router.get('/reminders', async (_req, res, next) => {
  try {
    const sent = await runReminderSweep();
    res.json({ sent });
  } catch (err) {
    next(err);
  }
});

export default router;
