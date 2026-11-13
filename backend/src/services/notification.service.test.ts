import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMail } = vi.hoisted(() => {
  process.env.SMTP_HOST = 'smtp.test';
  process.env.SMTP_USER = 'user';
  return { sendMail: vi.fn() };
});

vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import { notifyAppointmentCreated } from './notification.service';

const appt = {
  startAt: new Date('2026-12-01T13:00:00Z'),
  client: { name: 'Ana', email: 'ana@example.com' },
  barber: { user: { name: 'Mateo', email: 'mateo@barberia.com' } },
  service: { name: 'Corte' },
};

beforeEach(() => {
  sendMail.mockReset();
});

describe('notifyAppointmentCreated', () => {
  it('envía un correo al cliente y otro al barbero', async () => {
    sendMail.mockResolvedValue({});
    await notifyAppointmentCreated(appt);
    expect(sendMail.mock.calls.map(([m]) => m.to)).toEqual(['ana@example.com', 'mateo@barberia.com']);
  });

  it('si falla el del cliente, el barbero igual recibe el suyo', async () => {
    sendMail.mockImplementation(async (msg: { to: string }) => {
      if (msg.to === 'ana@example.com') throw new Error('rebote');
      return {};
    });
    await expect(notifyAppointmentCreated(appt)).rejects.toThrow(/1 de 2/);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'mateo@barberia.com' }));
  });
});
