/** Utilidades puras de manejo de horarios (sin dependencias de DB). */

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export interface CandidateSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
}

/**
 * Genera los slots candidatos dentro de un turno [startTime, endTime),
 * avanzando `stepMin` minutos y reservando `durationMin` para cada cita.
 * No incluye slots cuyo fin exceda el cierre del turno.
 */
export function generateCandidateSlots(
  startTime: string,
  endTime: string,
  durationMin: number,
  stepMin = 30,
): CandidateSlot[] {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const slots: CandidateSlot[] = [];
  for (let m = startMinutes; m + durationMin <= endMinutes; m += stepMin) {
    slots.push({ startTime: minutesToTime(m), endTime: minutesToTime(m + durationMin) });
  }
  return slots;
}

/** True si dos rangos [aStart, aEnd) y [bStart, bEnd) se solapan. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export interface TimeRange {
  startTime: string; // "09:00"
  endTime: string;   // "13:00"
}

/** True si [start, end) cabe completo dentro de alguno de los rangos. */
export function fitsInRanges(ranges: TimeRange[], start: string, end: string): boolean {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (e <= s) return false;
  return ranges.some((r) => s >= timeToMinutes(r.startTime) && e <= timeToMinutes(r.endTime));
}

/**
 * Valida una lista de rangos de un mismo día: cada uno con inicio < fin y sin
 * solaparse entre sí. Devuelve el mensaje de error o null si es válida.
 */
export function validateDayRanges(ranges: TimeRange[]): string | null {
  const sorted = [...ranges].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (timeToMinutes(r.startTime) >= timeToMinutes(r.endTime)) {
      return `El tramo ${r.startTime}–${r.endTime} tiene hora de inicio mayor o igual a la de fin`;
    }
    const prev = sorted[i - 1];
    if (prev && timeToMinutes(r.startTime) < timeToMinutes(prev.endTime)) {
      return `Los tramos ${prev.startTime}–${prev.endTime} y ${r.startTime}–${r.endTime} se solapan`;
    }
  }
  return null;
}

/** Suma `days` a una fecha civil "YYYY-MM-DD" (sin depender de la zona horaria). */
export function addCivilDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
