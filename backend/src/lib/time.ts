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
