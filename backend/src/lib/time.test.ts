import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  generateCandidateSlots,
  rangesOverlap,
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
