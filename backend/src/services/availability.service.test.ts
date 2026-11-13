import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    schedule: { findMany: vi.fn() },
    service: { findUnique: vi.fn() },
    appointment: { findMany: vi.fn() },
    scheduleBlock: { findMany: vi.fn() },
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }));

import { getAvailableSlots } from './availability.service';
import { zonedWallTimeToUtc, getZonedDateStr } from '../lib/timezone';

/** Fecha civil (zona de la barbería) a `days` días vista. */
function futureDay(days = 7): string {
  return getZonedDateStr(new Date(Date.now() + days * 86_400_000));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.appointment.findMany.mockResolvedValue([]);
  mockPrisma.scheduleBlock.findMany.mockResolvedValue([]);
  mockPrisma.service.findUnique.mockResolvedValue({ durationMin: 30 });
});

describe('getAvailableSlots', () => {
  it('devuelve vacío si el barbero no trabaja ese día', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([]);
    expect(await getAvailableSlots('b1', futureDay(), 's1')).toEqual([]);
  });

  it('genera slots en cada tramo y salta la pausa de almuerzo', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '15:00', endTime: '16:00' },
    ]);
    const slots = await getAvailableSlots('b1', futureDay(), 's1');
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '09:30', '15:00', '15:30']);
  });

  it('oculta los slots que pisan un bloqueo', async () => {
    const day = futureDay();
    mockPrisma.schedule.findMany.mockResolvedValue([{ startTime: '09:00', endTime: '11:00' }]);
    mockPrisma.scheduleBlock.findMany.mockResolvedValue([
      { startAt: zonedWallTimeToUtc(day, '09:30'), endAt: zonedWallTimeToUtc(day, '10:30') },
    ]);
    const slots = await getAvailableSlots('b1', day, 's1');
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '10:30']);
  });

  it('un bloqueo de día completo deja el día sin slots', async () => {
    const day = futureDay();
    mockPrisma.schedule.findMany.mockResolvedValue([{ startTime: '09:00', endTime: '18:00' }]);
    mockPrisma.scheduleBlock.findMany.mockResolvedValue([
      { startAt: zonedWallTimeToUtc(day, '00:00'), endAt: zonedWallTimeToUtc(futureDay(8), '00:00') },
    ]);
    expect(await getAvailableSlots('b1', day, 's1')).toEqual([]);
  });

  it('oculta slots ocupados por citas activas', async () => {
    const day = futureDay();
    mockPrisma.schedule.findMany.mockResolvedValue([{ startTime: '09:00', endTime: '10:30' }]);
    mockPrisma.appointment.findMany.mockResolvedValue([
      { startAt: zonedWallTimeToUtc(day, '09:30'), endAt: zonedWallTimeToUtc(day, '10:00') },
    ]);
    const slots = await getAvailableSlots('b1', day, 's1');
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '10:00']);
  });
});
