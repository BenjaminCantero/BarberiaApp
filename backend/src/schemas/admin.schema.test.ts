import { describe, expect, it } from 'vitest';
import { updateBarberAccountSchema } from './admin.schema';

describe('edición administrativa de cuentas de barbero', () => {
  it('acepta datos parciales y normaliza el correo', () => {
    const result = updateBarberAccountSchema.parse({
      body: { email: ' BARBERO@EXAMPLE.COM ', phone: null },
    });
    expect(result.body).toEqual({ email: 'barbero@example.com', phone: null });
  });

  it('rechaza una actualización vacía', () => {
    expect(updateBarberAccountSchema.safeParse({ body: {} }).success).toBe(false);
  });

  it('exige una contraseña fuerte cuando se reemplaza', () => {
    expect(updateBarberAccountSchema.safeParse({ body: { password: 'debil123' } }).success).toBe(false);
    expect(updateBarberAccountSchema.safeParse({ body: { password: 'Segura123' } }).success).toBe(true);
  });
});
