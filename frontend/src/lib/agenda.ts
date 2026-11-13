/**
 * Fechas de la agenda en la zona horaria de la BARBERÍA, no la del navegador.
 * Un cliente que abre la web desde otro país (o un navegador mal configurado)
 * debe ver "hoy" y las horas igual que el barbero.
 */
import type { Schedule } from '../api/barber.api';

export const SHOP_TIMEZONE = import.meta.env.VITE_SHOP_TIMEZONE || 'America/Santiago';

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
/** Orden de visualización: semana empieza el lunes. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Fecha civil "YYYY-MM-DD" de un instante en la zona de la barbería. */
export function shopDate(instant: Date | string = new Date()): string {
  return dateFmt.format(typeof instant === 'string' ? new Date(instant) : instant);
}

/** Hora "HH:MM" de un instante en la zona de la barbería. */
export function shopTime(instant: Date | string = new Date()): string {
  return timeFmt.format(typeof instant === 'string' ? new Date(instant) : instant);
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0=Domingo … 6=Sábado de una fecha civil. */
export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** Lunes de la semana de `date`. */
export function startOfWeek(date: string): string {
  return addDays(date, -((dayOfWeek(date) + 6) % 7));
}

/** "lunes 15 de junio" */
export function formatLongDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
}

/** "15 jun" */
export function formatShortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

export interface Range { startTime: string; endTime: string }

/** Tramos activos agrupados por día (0-6), ordenados por hora. */
export function rangesByDay(schedules: Schedule[] = []): Map<number, Range[]> {
  const map = new Map<number, Range[]>();
  for (const s of schedules) {
    if (!s.isActive) continue;
    const list = map.get(s.dayOfWeek) ?? [];
    list.push({ startTime: s.startTime, endTime: s.endTime });
    map.set(s.dayOfWeek, list);
  }
  for (const list of map.values()) list.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  return map;
}

export function formatRanges(ranges: Range[]): string {
  return ranges.map((r) => `${r.startTime}–${r.endTime}`).join(' · ');
}

/**
 * Primer día (desde hoy en la barbería) con horario y con tiempo restante para
 * al menos un turno de `minMinutes`.
 */
export function nextWorkingDate(schedules: Schedule[] = [], minMinutes = 30): string {
  const byDay = rangesByDay(schedules);
  const today = shopDate();
  if (byDay.size === 0) return today;
  const nowMin = toMinutes(shopTime());
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const ranges = byDay.get(dayOfWeek(date));
    if (!ranges) continue;
    if (i === 0) {
      const lastStart = Math.max(...ranges.map((r) => toMinutes(r.endTime))) - minMinutes;
      if (nowMin >= lastStart) continue;
    }
    return date;
  }
  return today;
}

/**
 * Instante ISO de una hora de pared ("YYYY-MM-DD" + "HH:MM") en la zona de la
 * barbería. Mismo algoritmo que el backend (`zonedWallTimeToUtc`).
 */
export function shopWallTimeToIso(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIMEZONE, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(guess));
  const m: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') m[p.type] = Number(p.value);
  const offset = Date.UTC(m.year, m.month - 1, m.day, m.hour % 24, m.minute, m.second) - guess;
  return new Date(guess - offset).toISOString();
}

/** Límites [inicio, fin) de un día civil de la barbería. */
export function zonedDayBounds(date: string): { start: Date; end: Date } {
  return {
    start: new Date(shopWallTimeToIso(date, '00:00')),
    end: new Date(shopWallTimeToIso(addDays(date, 1), '00:00')),
  };
}
