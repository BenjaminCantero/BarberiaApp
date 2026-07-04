import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// Mockeamos Prisma para probar la LÓGICA de negocio (permisos, colisiones,
// transiciones de estado) sin depender de una base de datos real.

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    barber: { findUnique: vi.fn() },
    barberService: { findUnique: vi.fn() },
    schedule: { findFirst: vi.fn() },
    service: { findUnique: vi.fn() },
    appointment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    // La forma callback: ejecuta la transacción pasándole el mismo mock como `tx`.
    $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockPrisma)),
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('./notification.service', () => ({
  notifyAppointmentCreated: vi.fn().mockResolvedValue(undefined),
  notifyAppointmentRescheduled: vi.fn().mockResolvedValue(undefined),
  notifyAppointmentConfirmed: vi.fn().mockResolvedValue(undefined),
  notifyAppointmentCancelled: vi.fn().mockResolvedValue(undefined),
}));

import {
  createAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
} from './appointment.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fecha futura (por defecto 7 días) a una hora local concreta. */
function futureAt(hour = 12, daysAhead = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const OPEN_SCHEDULE = { startTime: '00:00', endTime: '23:59', isActive: true };

/** Ejecuta `fn` y devuelve el AppError capturado (o falla el test). */
async function catchErr(fn: () => Promise<unknown>): Promise<{ statusCode: number; message: string }> {
  try {
    await fn();
  } catch (e) {
    return e as { statusCode: number; message: string };
  }
  throw new Error('Se esperaba un error pero la promesa resolvió');
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restaurar la implementación de $transaction tras clearAllMocks.
  mockPrisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(mockPrisma));
});

// ─── createAppointment ───────────────────────────────────────────────────────

describe('createAppointment', () => {
  const baseData = { barberId: 'b1', serviceId: 's1', startAt: futureAt().toISOString(), notes: '' };

  it('rechaza si el barbero no existe o está inactivo', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue(null);
    const err = await catchErr(() => createAppointment('c1', baseData));
    expect(err.statusCode).toBe(404);
  });

  it('rechaza si el barbero no ofrece el servicio', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue(null);
    const err = await catchErr(() => createAppointment('c1', baseData));
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/no ofrece/i);
  });

  it('rechaza una fecha en el pasado', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const err = await catchErr(() => createAppointment('c1', { ...baseData, startAt: past }));
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/futuro/i);
  });

  it('rechaza si el barbero no trabaja ese día', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findFirst.mockResolvedValue(null);
    const err = await catchErr(() => createAppointment('c1', baseData));
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/no trabaja/i);
  });

  it('rechaza un horario fuera del turno del barbero', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findFirst.mockResolvedValue({ startTime: '09:00', endTime: '10:00', isActive: true });
    const err = await catchErr(() =>
      createAppointment('c1', { ...baseData, startAt: futureAt(23).toISOString() }),
    );
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/fuera del turno/i);
  });

  it('rechaza con 409 si el slot ya está ocupado (colisión)', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findFirst.mockResolvedValue(OPEN_SCHEDULE);
    mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'existing' }); // hay colisión
    const err = await catchErr(() => createAppointment('c1', baseData));
    expect(err.statusCode).toBe(409);
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it('crea la cita cuando no hay colisión', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findFirst.mockResolvedValue(OPEN_SCHEDULE);
    mockPrisma.appointment.findFirst.mockResolvedValue(null); // sin colisión
    mockPrisma.appointment.create.mockResolvedValue({ id: 'new', client: { email: 'x' }, barber: { user: {} }, service: {} });

    const result = await createAppointment('c1', baseData);
    expect(result).toMatchObject({ id: 'new' });
    expect(mockPrisma.appointment.create).toHaveBeenCalledOnce();
  });
});

// ─── rescheduleAppointment ───────────────────────────────────────────────────

describe('rescheduleAppointment', () => {
  const newStart = futureAt(12).toISOString();

  it('404 si la cita no existe', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue(null);
    const err = await catchErr(() => rescheduleAppointment('a1', 'c1', 'CLIENT', newStart));
    expect(err.statusCode).toBe(404);
  });

  it('403 si un cliente intenta reprogramar una cita ajena', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'OTHER', barberId: 'b1', serviceId: 's1', status: 'CONFIRMED', startAt: futureAt(),
    });
    const err = await catchErr(() => rescheduleAppointment('a1', 'c1', 'CLIENT', newStart));
    expect(err.statusCode).toBe(403);
  });

  it('403 si un barbero no asignado intenta reprogramar', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', serviceId: 's1', status: 'CONFIRMED', startAt: futureAt(),
    });
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'DIFFERENT' });
    const err = await catchErr(() => rescheduleAppointment('a1', 'barberUser', 'BARBER', newStart));
    expect(err.statusCode).toBe(403);
  });

  it('400 si la cita ya está completada o cancelada', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', serviceId: 's1', status: 'COMPLETED', startAt: futureAt(),
    });
    const err = await catchErr(() => rescheduleAppointment('a1', 'c1', 'CLIENT', newStart));
    expect(err.statusCode).toBe(400);
  });

  it('400 si el cliente reprograma con menos de 2h de antelación', async () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000); // dentro de 1h
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', serviceId: 's1', status: 'CONFIRMED', startAt: soon,
    });
    const err = await catchErr(() => rescheduleAppointment('a1', 'c1', 'CLIENT', newStart));
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/2 horas/i);
  });

  it('409 si el nuevo horario colisiona con otra cita', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', serviceId: 's1', status: 'CONFIRMED', startAt: futureAt(),
    });
    mockPrisma.service.findUnique.mockResolvedValue({ durationMin: 30 });
    mockPrisma.schedule.findFirst.mockResolvedValue(OPEN_SCHEDULE);
    mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'other' }); // colisión
    const err = await catchErr(() => rescheduleAppointment('a1', 'c1', 'CLIENT', newStart));
    expect(err.statusCode).toBe(409);
    expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
  });

  it('reprograma cuando todo es válido', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', serviceId: 's1', status: 'CONFIRMED', startAt: futureAt(),
    });
    mockPrisma.service.findUnique.mockResolvedValue({ durationMin: 30 });
    mockPrisma.schedule.findFirst.mockResolvedValue(OPEN_SCHEDULE);
    mockPrisma.appointment.findFirst.mockResolvedValue(null); // sin colisión
    mockPrisma.appointment.update.mockResolvedValue({ id: 'a1', client: { email: 'x' }, barber: { user: {} }, service: {} });

    const result = await rescheduleAppointment('a1', 'c1', 'CLIENT', newStart);
    expect(result).toMatchObject({ id: 'a1' });
    expect(mockPrisma.appointment.update).toHaveBeenCalledOnce();
  });
});

// ─── updateAppointmentStatus ─────────────────────────────────────────────────

describe('updateAppointmentStatus', () => {
  it('403 si un cliente intenta confirmar (solo puede cancelar)', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', status: 'PENDING', startAt: futureAt(),
    });
    const err = await catchErr(() => updateAppointmentStatus('a1', 'c1', 'CLIENT', 'CONFIRMED'));
    expect(err.statusCode).toBe(403);
  });

  it('403 si un cliente opera sobre una cita ajena', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'OTHER', barberId: 'b1', status: 'PENDING', startAt: futureAt(),
    });
    const err = await catchErr(() => updateAppointmentStatus('a1', 'c1', 'CLIENT', 'CANCELLED'));
    expect(err.statusCode).toBe(403);
  });

  it('400 ante una transición inválida (COMPLETED → CONFIRMED)', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', status: 'COMPLETED', startAt: futureAt(),
    });
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    const err = await catchErr(() => updateAppointmentStatus('a1', 'barberUser', 'BARBER', 'CONFIRMED'));
    expect(err.statusCode).toBe(400);
  });

  it('un barbero confirma una cita pendiente', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', status: 'PENDING', startAt: futureAt(),
    });
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    mockPrisma.appointment.update.mockResolvedValue({ id: 'a1', client: { email: 'x' }, barber: { user: {} }, service: {} });

    const result = await updateAppointmentStatus('a1', 'barberUser', 'BARBER', 'CONFIRMED');
    expect(result).toMatchObject({ id: 'a1' });
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CONFIRMED' } }),
    );
  });
});
