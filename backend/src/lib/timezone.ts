/**
 * Utilidades de zona horaria del negocio.
 *
 * Los horarios de los barberos se guardan como "hora de pared" ("09:00"-"18:00")
 * en la zona horaria de la barbería (SHOP_TIMEZONE). Para razonar sobre instantes
 * (Date/UTC) hay que convertir SIEMPRE respecto de esa zona, nunca de la zona del
 * servidor (que en Docker suele ser UTC). Estas funciones encapsulan la conversión
 * usando Intl, sin dependencias externas.
 */

export const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE ?? 'America/Argentina/Buenos_Aires';

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Extrae los componentes numéricos de un instante en `timeZone`. */
function partsInZone(instant: Date, timeZone: string): Record<string, number> {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== 'literal') map[p.type] = Number(p.value);
  }
  return map;
}

/** Offset (ms) de `timeZone` en el instante `date`. Positivo si la zona va por delante de UTC. */
function tzOffsetMs(timeZone: string, date: Date): number {
  const m = partsInZone(date, timeZone);
  const asUTC = Date.UTC(m.year, m.month - 1, m.day, m.hour % 24, m.minute, m.second);
  return asUTC - date.getTime();
}

/**
 * Convierte una hora de pared (fecha civil "YYYY-MM-DD" + "HH:MM") interpretada
 * en `timeZone` al instante UTC correspondiente.
 */
export function zonedWallTimeToUtc(date: string, time: string, timeZone = SHOP_TIMEZONE): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, 0);
  // Corregimos por el offset real de la zona en ese instante.
  const offset = tzOffsetMs(timeZone, new Date(utcGuess));
  return new Date(utcGuess - offset);
}

/** Día de la semana (0=Domingo … 6=Sábado) de un instante, en `timeZone`. */
export function getZonedDayOfWeek(instant: Date, timeZone = SHOP_TIMEZONE): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(instant);
  return WEEKDAY_INDEX[wd];
}

/** Hora de pared "HH:MM" de un instante, en `timeZone`. */
export function getZonedHHMM(instant: Date, timeZone = SHOP_TIMEZONE): string {
  const m = partsInZone(instant, timeZone);
  const hh = String(m.hour % 24).padStart(2, '0');
  const mm = String(m.minute).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Día de la semana (0-6) de una fecha civil "YYYY-MM-DD", independiente de la zona. */
export function civilDateDayOfWeek(date: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12)).getUTCDay();
}
