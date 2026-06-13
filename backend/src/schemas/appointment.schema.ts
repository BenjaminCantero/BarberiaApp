import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    barberId: z.string().uuid('ID de barbero inválido'),
    serviceId: z.string().uuid('ID de servicio inválido'),
    startAt: z.string().datetime('Fecha/hora inválida (ISO 8601 requerido)'),
    notes: z.string().max(300).optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED'], {
      errorMap: () => ({ message: 'Estado inválido. Valores: CONFIRMED, CANCELLED, COMPLETED' }),
    }),
  }),
});

export const listAppointmentsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>['body'];
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>['body'];
