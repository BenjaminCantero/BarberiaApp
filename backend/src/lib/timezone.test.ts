import { describe, it, expect } from 'vitest';
import {
  zonedWallTimeToUtc,
  getZonedDayOfWeek,
  getZonedHHMM,
  civilDateDayOfWeek,
} from './timezone';

const BA = 'America/Argentina/Buenos_Aires'; // UTC-3 fijo (sin DST)
const NY = 'America/New_York'; // UTC-4 en verano, UTC-5 en invierno

describe('zonedWallTimeToUtc', () => {
  it('Buenos Aires (UTC-3): 09:00 local = 12:00 UTC', () => {
    const utc = zonedWallTimeToUtc('2026-07-10', '09:00', BA);
    expect(utc.toISOString()).toBe('2026-07-10T12:00:00.000Z');
  });

  it('UTC: la hora de pared coincide con UTC', () => {
    const utc = zonedWallTimeToUtc('2026-07-10', '14:30', 'UTC');
    expect(utc.toISOString()).toBe('2026-07-10T14:30:00.000Z');
  });

  it('New York en verano (EDT, UTC-4): 09:00 = 13:00 UTC', () => {
    const utc = zonedWallTimeToUtc('2026-07-10', '09:00', NY);
    expect(utc.toISOString()).toBe('2026-07-10T13:00:00.000Z');
  });

  it('New York en invierno (EST, UTC-5): 09:00 = 14:00 UTC', () => {
    const utc = zonedWallTimeToUtc('2026-01-10', '09:00', NY);
    expect(utc.toISOString()).toBe('2026-01-10T14:00:00.000Z');
  });
});

describe('getZonedDayOfWeek / getZonedHHMM', () => {
  it('lee la hora de pared en la zona de la barbería', () => {
    // 12:00 UTC es 09:00 en Buenos Aires
    const instant = new Date('2026-07-10T12:00:00.000Z');
    expect(getZonedHHMM(instant, BA)).toBe('09:00');
  });

  it('el día de la semana se calcula en la zona local', () => {
    // 2026-07-10 es viernes (5). A las 01:00 UTC en Buenos Aires todavía es
    // jueves 9 (22:00 del día anterior).
    const instant = new Date('2026-07-10T01:00:00.000Z');
    expect(getZonedDayOfWeek(instant, BA)).toBe(4); // jueves
    expect(getZonedHHMM(instant, BA)).toBe('22:00');
  });
});

describe('round-trip', () => {
  it('wall → utc → wall preserva la hora', () => {
    for (const time of ['08:15', '12:00', '18:45']) {
      const utc = zonedWallTimeToUtc('2026-07-10', time, BA);
      expect(getZonedHHMM(utc, BA)).toBe(time);
    }
  });
});

describe('civilDateDayOfWeek', () => {
  it('devuelve el día de la semana de una fecha civil', () => {
    expect(civilDateDayOfWeek('2026-07-10')).toBe(5); // viernes
    expect(civilDateDayOfWeek('2026-07-12')).toBe(0); // domingo
  });
});
