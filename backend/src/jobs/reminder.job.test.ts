import { describe, it, expect, vi, beforeEach } from 'vitest';
const { findMany, update, notify } = vi.hoisted(() => ({ findMany: vi.fn(), update: vi.fn(), notify: vi.fn() }));
vi.mock('../lib/prisma', () => ({ prisma: { appointment: { findMany, update } } }));
vi.mock('../services/notification.service', () => ({ notifyAppointmentReminder: notify }));
import { runReminderSweep } from './reminder.job';
beforeEach(() => vi.resetAllMocks());
describe('recordatorios de invitados', () => {
  it('incluye pendientes y usa el correo del invitado', async () => {
    findMany.mockResolvedValue([{ id: 'guest', client: null, guestName: 'Ana', guestEmail: 'ana@example.com' }]);
    notify.mockResolvedValue(undefined);
    update.mockResolvedValue({});
    expect(await runReminderSweep()).toBe(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ['PENDING', 'CONFIRMED'] } }) }));
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ client: expect.objectContaining({ email: 'ana@example.com' }) }));
    expect(update).toHaveBeenCalledOnce();
  });
  it('no marca como enviado un correo fallido para permitir el reintento', async () => {
    findMany.mockResolvedValue([{ id: 'guest', client: null, guestName: 'Ana', guestEmail: 'ana@example.com' }]);
    notify.mockRejectedValue(new Error('SMTP no disponible'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(await runReminderSweep()).toBe(0);
      expect(update).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});
