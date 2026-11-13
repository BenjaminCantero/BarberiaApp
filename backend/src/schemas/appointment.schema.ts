import { z } from 'zod';
import { serviceIdSchema } from './resource-id.schema';

export const createAppointmentSchema = z.object({
  body: z.object({
    barberId: z.string().uuid('ID de barbero inválido'),
    serviceId: serviceIdSchema,
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

export const rescheduleAppointmentSchema = z.object({
  body: z.object({
    startAt: z.string().datetime('Fecha/hora inválida (ISO 8601 requerido)'),
  }),
});

export const listAppointmentsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>['body'];
export const guestAppointmentSchema = createAppointmentSchema.extend({
  body: createAppointmentSchema.shape.body.extend({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(30).optional(),
  }),
});
export type GuestAppointmentInput = z.infer<typeof guestAppointmentSchema>['body'];
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>['body'];
