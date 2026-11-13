import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// Mockeamos Prisma para probar la LÓGICA de negocio (permisos, colisiones,
// transiciones de estado) sin depender de una base de datos real.

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    barber: { findUnique: vi.fn() },
    barberService: { findUnique: vi.fn() },
    schedule: { findMany: vi.fn() },
    scheduleBlock: { findFirst: vi.fn() },
    service: { findUnique: vi.fn() },
    appointment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
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

import { zonedWallTimeToUtc, getZonedDateStr } from '../lib/timezone';
import {
  createAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  getMyAppointments,
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
  mockPrisma.scheduleBlock.findFirst.mockResolvedValue(null);
});

// ─── createAppointment ───────────────────────────────────────────────────────

describe('createAppointment', () => {
  it('rechaza reservas sin cuenta ni contacto', async () => {
    const err = await catchErr(() => createAppointment(null, { barberId: 'b1', serviceId: 's1', startAt: futureAt().toISOString() }));
    expect(err.statusCode).toBe(400);
  });

  it('reserva como invitado sin crear un usuario y conserva su contacto', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30, isActive: true } });
    mockPrisma.schedule.findMany.mockResolvedValue([OPEN_SCHEDULE]);
    mockPrisma.appointment.findFirst.mockResolvedValue(null);
    mockPrisma.appointment.create.mockResolvedValue({ id: 'a1', client: null, guestName: 'Ana', guestEmail: 'ana@example.com', guestPhone: null });
    const appointment = await createAppointment(null, { barberId: 'b1', serviceId: 's1', startAt: futureAt().toISOString() }, { name: 'Ana', email: 'ana@example.com' });
    expect(appointment.client).toMatchObject({ name: 'Ana', email: 'ana@example.com' });
    expect(mockPrisma.appointment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ clientId: null, guestEmail: 'ana@example.com' }) }));
  });

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
    mockPrisma.schedule.findMany.mockResolvedValue([]);
    const err = await catchErr(() => createAppointment('c1', baseData));
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/no trabaja/i);
  });

  it('rechaza un horario fuera del turno del barbero', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findMany.mockResolvedValue([{ startTime: '09:00', endTime: '10:00', isActive: true }]);
    const err = await catchErr(() =>
      createAppointment('c1', { ...baseData, startAt: futureAt(23).toISOString() }),
    );
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/fuera del turno/i);
  });

  it('rechaza con 409 si el slot ya está ocupado (colisión)', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findMany.mockResolvedValue([OPEN_SCHEDULE]);
    mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'existing' }); // hay colisión
    const err = await catchErr(() => createAppointment('c1', baseData));
    expect(err.statusCode).toBe(409);
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it('rechaza una cita que cae en la pausa entre dos tramos del día', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findMany.mockResolvedValue([
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '15:00', endTime: '19:00' },
    ]);
    const day = getZonedDateStr(futureAt());
    const lunch = zonedWallTimeToUtc(day, '13:30').toISOString();
    const err = await catchErr(() => createAppointment('c1', { ...baseData, startAt: lunch }));
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/fuera del turno/i);
  });

  it('rechaza una cita que empieza en un tramo y termina en la pausa', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 60 } });
    mockPrisma.schedule.findMany.mockResolvedValue([
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '15:00', endTime: '19:00' },
    ]);
    const day = getZonedDateStr(futureAt());
    const err = await catchErr(() =>
      createAppointment('c1', { ...baseData, startAt: zonedWallTimeToUtc(day, '12:30').toISOString() }),
    );
    expect(err.statusCode).toBe(400);
  });

  it('acepta una cita en el segundo tramo del día', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findMany.mockResolvedValue([
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '15:00', endTime: '19:00' },
    ]);
    mockPrisma.appointment.findFirst.mockResolvedValue(null);
    mockPrisma.appointment.create.mockResolvedValue({ id: 'new', client: { email: 'x' }, barber: { user: {} }, service: {} });
    const day = getZonedDateStr(futureAt());
    const result = await createAppointment('c1', { ...baseData, startAt: zonedWallTimeToUtc(day, '15:00').toISOString() });
    expect(result).toMatchObject({ id: 'new' });
  });

  it('rechaza con 409 si el barbero bloqueó ese horario', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findMany.mockResolvedValue([OPEN_SCHEDULE]);
    mockPrisma.scheduleBlock.findFirst.mockResolvedValue({ id: 'blk' });
    const err = await catchErr(() => createAppointment('c1', baseData));
    expect(err.statusCode).toBe(409);
    expect(err.message).toMatch(/no atiende/i);
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it('crea la cita cuando no hay colisión', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findMany.mockResolvedValue([OPEN_SCHEDULE]);
    mockPrisma.appointment.findFirst.mockResolvedValue(null); // sin colisión
    mockPrisma.appointment.create.mockResolvedValue({ id: 'new', client: { email: 'x' }, barber: { user: {} }, service: {} });

    const result = await createAppointment('c1', baseData);
    expect(result).toMatchObject({ id: 'new' });
    expect(mockPrisma.appointment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'CONFIRMED' }), // confirmación automática
    }));
  });
});

describe('createAppointment: solapes del mismo cliente', () => {
  it('409 si el cliente ya tiene otra cita que se cruza, aunque sea con otro barbero', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findMany.mockResolvedValue([OPEN_SCHEDULE]);
    // 1ª findFirst: colisión del barbero (libre); 2ª: solape del cliente.
    mockPrisma.appointment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'other' });

    const err = await catchErr(() => createAppointment('c1', { barberId: 'b1', serviceId: 's1', startAt: futureAt().toISOString() }));
    expect(err.statusCode).toBe(409);
    expect(err.message).toMatch(/otra cita/);
    expect(mockPrisma.appointment.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: [{ clientId: 'c1' }] }),
    }));
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it('un invitado se identifica por email sin distinguir mayúsculas', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1', isActive: true });
    mockPrisma.barberService.findUnique.mockResolvedValue({ service: { durationMin: 30 } });
    mockPrisma.schedule.findMany.mockResolvedValue([OPEN_SCHEDULE]);
    mockPrisma.appointment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'other' });

    const err = await catchErr(() => createAppointment(null,
      { barberId: 'b1', serviceId: 's1', startAt: futureAt().toISOString() },
      { name: 'Ana', email: 'Ana@Mail.com' }));
    expect(err.statusCode).toBe(409);
    expect(mockPrisma.appointment.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: [{ guestEmail: { equals: 'Ana@Mail.com', mode: 'insensitive' } }] }),
    }));
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
    mockPrisma.schedule.findMany.mockResolvedValue([OPEN_SCHEDULE]);
    mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'other' }); // colisión
    const err = await catchErr(() => rescheduleAppointment('a1', 'c1', 'CLIENT', newStart));
    expect(err.statusCode).toBe(409);
    expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
  });

  it('409 si el nuevo horario cae en un bloqueo', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', serviceId: 's1', status: 'CONFIRMED', startAt: futureAt(),
    });
    mockPrisma.service.findUnique.mockResolvedValue({ durationMin: 30 });
    mockPrisma.schedule.findMany.mockResolvedValue([OPEN_SCHEDULE]);
    mockPrisma.scheduleBlock.findFirst.mockResolvedValue({ id: 'blk' });
    const err = await catchErr(() => rescheduleAppointment('a1', 'c1', 'CLIENT', newStart));
    expect(err.statusCode).toBe(409);
    expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
  });

  it('reprograma cuando todo es válido', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', serviceId: 's1', status: 'CONFIRMED', startAt: futureAt(),
    });
    mockPrisma.service.findUnique.mockResolvedValue({ durationMin: 30 });
    mockPrisma.schedule.findMany.mockResolvedValue([OPEN_SCHEDULE]);
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
    mockPrisma.appointment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.appointment.findUniqueOrThrow.mockResolvedValue({ id: 'a1', client: { email: 'x' }, barber: { user: {} }, service: {} });

    const result = await updateAppointmentStatus('a1', 'barberUser', 'BARBER', 'CONFIRMED');
    expect(result).toMatchObject({ id: 'a1' });
    // La transición se condiciona al estado leído (compare-and-set).
    expect(mockPrisma.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: 'a1', status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    });
  });

  it('si el barbero cancela, se envía el correo de cancelación al cliente', async () => {
    const notifications = await import('./notification.service');
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', status: 'CONFIRMED', startAt: futureAt(), endAt: futureAt(13),
    });
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    mockPrisma.appointment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.appointment.findUniqueOrThrow.mockResolvedValue({ id: 'a1', client: { email: 'x' }, barber: { user: {} }, service: {} });
    await updateAppointmentStatus('a1', 'barberUser', 'BARBER', 'CANCELLED');
    expect(notifications.notifyAppointmentCancelled).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }), 'BARBER');
  });

  it('409 si otra petición cambió el estado entre la lectura y la escritura', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', status: 'PENDING', startAt: futureAt(), endAt: futureAt(13),
    });
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    mockPrisma.appointment.updateMany.mockResolvedValue({ count: 0 });
    const err = await catchErr(() => updateAppointmentStatus('a1', 'barberUser', 'BARBER', 'CANCELLED'));
    expect(err.statusCode).toBe(409);
  });

  it('400 si se intenta completar una cita que aún no termina', async () => {
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', status: 'CONFIRMED', startAt: futureAt(), endAt: futureAt(13),
    });
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    const err = await catchErr(() => updateAppointmentStatus('a1', 'barberUser', 'BARBER', 'COMPLETED'));
    expect(err.statusCode).toBe(400);
    expect(mockPrisma.appointment.updateMany).not.toHaveBeenCalled();
  });

  it('permite completar una cita que ya terminó', async () => {
    const past = new Date(Date.now() - 3_600_000);
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: 'a1', clientId: 'c1', barberId: 'b1', status: 'CONFIRMED',
      startAt: new Date(past.getTime() - 1_800_000), endAt: past,
    });
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    mockPrisma.appointment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.appointment.findUniqueOrThrow.mockResolvedValue({ id: 'a1', client: { email: 'x' }, barber: { user: {} }, service: {} });
    await updateAppointmentStatus('a1', 'barberUser', 'BARBER', 'COMPLETED');
    expect(mockPrisma.appointment.updateMany).toHaveBeenCalledOnce();
  });
});

// ─── getMyAppointments ───────────────────────────────────────────────────────

describe('getMyAppointments', () => {
  beforeEach(() => {
    mockPrisma.barber.findUnique.mockResolvedValue({ id: 'b1' });
    mockPrisma.appointment.findMany.mockResolvedValue([]);
  });

  it('corta el día en la medianoche de la barbería, no la del servidor', async () => {
    await getMyAppointments('u1', 'BARBER', { date: '2026-06-14' });
    const where = mockPrisma.appointment.findMany.mock.calls[0][0].where;
    expect(where.barberId).toBe('b1');
    expect(where.startAt).toEqual({
      gte: zonedWallTimeToUtc('2026-06-14', '00:00'),
      lt: zonedWallTimeToUtc('2026-06-15', '00:00'),
    });
  });

  it('acepta un rango from/to para la vista semanal', async () => {
    await getMyAppointments('u1', 'BARBER', { from: '2026-06-15', to: '2026-06-21' });
    const where = mockPrisma.appointment.findMany.mock.calls[0][0].where;
    expect(where.startAt).toEqual({
      gte: zonedWallTimeToUtc('2026-06-15', '00:00'),
      lt: zonedWallTimeToUtc('2026-06-22', '00:00'),
    });
  });

  it('rechaza rangos invertidos', async () => {
    const err = await catchErr(() => getMyAppointments('u1', 'BARBER', { from: '2026-06-21', to: '2026-06-15' }));
    expect(err.statusCode).toBe(400);
  });
});
