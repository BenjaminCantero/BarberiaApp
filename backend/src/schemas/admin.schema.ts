import { z } from 'zod';

export const changeRoleSchema = z.object({
  body: z.object({
    role: z.enum(['CLIENT', 'BARBER', 'ADMIN']),
  }),
});

export const changeStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const createBarberSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    bio: z.string().max(500).optional(),
  }),
});

export const adminAppointmentQuerySchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
    barberId: z.string().uuid().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>['body'];
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>['body'];
export type CreateBarberInput = z.infer<typeof createBarberSchema>['body'];
export type AdminAppointmentQuery = z.infer<
  typeof adminAppointmentQuerySchema
>['query'];
