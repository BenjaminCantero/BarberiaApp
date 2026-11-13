import { describe, it, expect } from 'vitest';
import { guestAppointmentSchema } from './appointment.schema';
import { availabilityQuerySchema, assignServiceSchema } from './barber.schema';

const booking = { barberId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', serviceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', startAt: '2030-01-01T12:00:00.000Z', name: ' Ana ', email: ' ANA@example.com ' };
describe('reserva pública', () => {
  it('permite consultar y reservar servicios existentes de demostración', () => {
    for (const serviceId of ['svc-corte', 'svc-barba', 'svc-combo']) {
      expect(availabilityQuerySchema.safeParse({ query: { date: '2030-01-01', serviceId } }).success).toBe(true);
      expect(assignServiceSchema.safeParse({ body: { serviceId } }).success).toBe(true);
      expect(guestAppointmentSchema.safeParse({ body: { ...booking, serviceId } }).success).toBe(true);
    }
  });
  it('rechaza identificadores vacíos o con caracteres inválidos', () => {
    for (const serviceId of ['', '../service', 'x'.repeat(101)]) {
      expect(availabilityQuerySchema.safeParse({ query: { date: '2030-01-01', serviceId } }).success).toBe(false);
    }
  });
  it('normaliza nombre y correo sin requerir credenciales', () => {
    expect(guestAppointmentSchema.parse({ body: booking }).body).toMatchObject({ name: 'Ana', email: 'ana@example.com' });
  });
  it('requiere contacto válido', () => {
    expect(guestAppointmentSchema.safeParse({ body: { ...booking, email: 'incorrecto' } }).success).toBe(false);
    expect(guestAppointmentSchema.safeParse({ body: { ...booking, name: ' ' } }).success).toBe(false);
  });
});
