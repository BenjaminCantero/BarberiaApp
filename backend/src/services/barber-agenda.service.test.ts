import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    barber: { findUnique: vi.fn() },
    schedule: { deleteMany: vi.fn(), createMany: vi.fn() },
    scheduleBlock: { create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    appointment: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('./review.service', () => ({ getRatingSummary: vi.fn(), getRatingSummaries: vi.fn() }));

import { setSchedule, createBlock, deleteBlock } from './barber.service';
import { getZonedDateStr, zonedWallTimeToUtc } from '../lib/timezone';

async function catchErr(fn: () => Promise<unknown>): Promise<{ statusCode: number; message: string }> {
  try { await fn(); } catch (e) { return e as { statusCode: number; message: string }; }
  throw new Error('Se esperaba un error');
}

const futureDay = (days = 7) => getZonedDateStr(new Date(Date.now() + days * 86_400_000));

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', userId: 'u1' });
  mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  mockPrisma.schedule.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.schedule.createMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({ count: data.length }));
  mockPrisma.appointment.count.mockResolvedValue(0);
});

describe('setSchedule', () => {
  it('guarda varios tramos el mismo día dentro de una transacción', async () => {
    const res = await setSchedule('b1', 'u1', 'BARBER', {
      schedule: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', isActive: true },
        { dayOfWeek: 1, startTime: '15:00', endTime: '19:00', isActive: true },
      ],
    });
    expect(res.count).toBe(2);
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it('permite dejar el horario vacío', async () => {
    const res = await setSchedule('b1', 'u1', 'BARBER', { schedule: [] });
    expect(res.count).toBe(0);
  });

  it('rechaza tramos solapados', async () => {
    const err = await catchErr(() => setSchedule('b1', 'u1', 'BARBER', {
      schedule: [
        { dayOfWeek: 2, startTime: '09:00', endTime: '13:00', isActive: true },
        { dayOfWeek: 2, startTime: '12:00', endTime: '18:00', isActive: true },
      ],
    }));
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/martes.*solapan/i);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('403 si otro barbero intenta editarlo', async () => {
    const err = await catchErr(() => setSchedule('b1', 'otro', 'BARBER', { schedule: [] }));
    expect(err.statusCode).toBe(403);
  });
});

describe('createBlock', () => {
  it('un rango de días va de medianoche a medianoche de la barbería', async () => {
    mockPrisma.scheduleBlock.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    const from = futureDay(7);
    const to = futureDay(9);
    const { block } = await createBlock('b1', 'u1', 'BARBER', { startDate: from, endDate: to, reason: 'Vacaciones' });
    expect(block).toMatchObject({
      startAt: zonedWallTimeToUtc(from, '00:00'),
      endAt: zonedWallTimeToUtc(futureDay(10), '00:00'),
      reason: 'Vacaciones',
    });
  });

  it('un bloqueo por horas usa ese tramo del día', async () => {
    mockPrisma.scheduleBlock.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    const day = futureDay();
    const { block } = await createBlock('b1', 'u1', 'BARBER', { startDate: day, startTime: '10:00', endTime: '12:00' });
    expect(block).toMatchObject({
      startAt: zonedWallTimeToUtc(day, '10:00'),
      endAt: zonedWallTimeToUtc(day, '12:00'),
    });
  });

  it('informa cuántas citas activas quedan dentro del bloqueo', async () => {
    mockPrisma.scheduleBlock.create.mockResolvedValue({ id: 'blk' });
    mockPrisma.appointment.count.mockResolvedValue(2);
    const res = await createBlock('b1', 'u1', 'BARBER', { startDate: futureDay() });
    expect(res.conflicts).toBe(2);
  });

  it('rechaza un bloqueo que ya terminó', async () => {
    const err = await catchErr(() => createBlock('b1', 'u1', 'BARBER', { startDate: '2020-01-01' }));
    expect(err.statusCode).toBe(400);
  });
});

describe('deleteBlock', () => {
  it('404 si el bloqueo no es de ese barbero', async () => {
    mockPrisma.scheduleBlock.deleteMany.mockResolvedValue({ count: 0 });
    const err = await catchErr(() => deleteBlock('b1', 'x', 'u1', 'BARBER'));
    expect(err.statusCode).toBe(404);
  });
});
