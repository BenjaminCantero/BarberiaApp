import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  generateCandidateSlots,
  rangesOverlap,
  fitsInRanges,
  validateDayRanges,
  addCivilDays,
} from './time';

describe('timeToMinutes / minutesToTime', () => {
  it('convierte HH:MM a minutos', () => {
    expect(timeToMinutes('09:00')).toBe(540);
    expect(timeToMinutes('00:30')).toBe(30);
    expect(timeToMinutes('18:45')).toBe(1125);
  });

  it('convierte minutos a HH:MM con padding', () => {
    expect(minutesToTime(540)).toBe('09:00');
    expect(minutesToTime(30)).toBe('00:30');
    expect(minutesToTime(1125)).toBe('18:45');
  });

  it('es reversible', () => {
    for (const t of ['08:15', '12:00', '23:59']) {
      expect(minutesToTime(timeToMinutes(t))).toBe(t);
    }
  });
});

describe('generateCandidateSlots', () => {
  it('genera slots de duración fija con paso de 30 min', () => {
    const slots = generateCandidateSlots('09:00', '11:00', 30, 30);
    expect(slots).toEqual([
      { startTime: '09:00', endTime: '09:30' },
      { startTime: '09:30', endTime: '10:00' },
      { startTime: '10:00', endTime: '10:30' },
      { startTime: '10:30', endTime: '11:00' },
    ]);
  });

  it('respeta la duración del servicio y no excede el cierre del turno', () => {
    const slots = generateCandidateSlots('09:00', '10:30', 45, 30);
    // 09:00-09:45 y 09:30-10:15 caben; 10:00-10:45 excede el cierre 10:30
    expect(slots).toEqual([
      { startTime: '09:00', endTime: '09:45' },
      { startTime: '09:30', endTime: '10:15' },
    ]);
  });

  it('devuelve vacío si el servicio no entra en el turno', () => {
    expect(generateCandidateSlots('09:00', '09:20', 30, 30)).toEqual([]);
  });
});

describe('rangesOverlap', () => {
  const d = (s: string) => new Date(`2026-06-26T${s}:00`);

  it('detecta solapamiento parcial', () => {
    expect(rangesOverlap(d('09:00'), d('09:45'), d('09:30'), d('10:00'))).toBe(true);
  });

  it('rangos contiguos no se solapan', () => {
    expect(rangesOverlap(d('09:00'), d('09:30'), d('09:30'), d('10:00'))).toBe(false);
  });

  it('rangos disjuntos no se solapan', () => {
    expect(rangesOverlap(d('09:00'), d('09:30'), d('10:00'), d('10:30'))).toBe(false);
  });
});

describe('fitsInRanges', () => {
  const split = [
    { startTime: '09:00', endTime: '13:00' },
    { startTime: '15:00', endTime: '19:00' },
  ];
  it('acepta un rango dentro de un tramo', () => {
    expect(fitsInRanges(split, '09:00', '09:30')).toBe(true);
    expect(fitsInRanges(split, '18:30', '19:00')).toBe(true);
  });
  it('rechaza la pausa y los rangos que la cruzan', () => {
    expect(fitsInRanges(split, '13:30', '14:00')).toBe(false);
    expect(fitsInRanges(split, '12:30', '13:30')).toBe(false);
    expect(fitsInRanges(split, '12:00', '16:00')).toBe(false);
  });
  it('rechaza rangos vacíos o invertidos', () => {
    expect(fitsInRanges(split, '10:00', '10:00')).toBe(false);
    expect(fitsInRanges(split, '23:30', '00:15')).toBe(false);
  });
});

describe('validateDayRanges', () => {
  it('acepta tramos separados sin importar el orden', () => {
    expect(validateDayRanges([
      { startTime: '15:00', endTime: '19:00' },
      { startTime: '09:00', endTime: '13:00' },
    ])).toBeNull();
  });
  it('acepta tramos contiguos', () => {
    expect(validateDayRanges([
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '13:00', endTime: '17:00' },
    ])).toBeNull();
  });
  it('detecta solapes', () => {
    expect(validateDayRanges([
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '12:00', endTime: '17:00' },
    ])).toMatch(/solapan/);
  });
  it('detecta inicio >= fin', () => {
    expect(validateDayRanges([{ startTime: '18:00', endTime: '09:00' }])).toMatch(/inicio/);
  });
});

describe('addCivilDays', () => {
  it('cruza fin de mes y de año', () => {
    expect(addCivilDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addCivilDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addCivilDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
