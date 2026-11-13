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
  body: z.union([
    z.object({
      userId: z.string().uuid(),
      bio: z.string().max(500).optional(),
    }),
    z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().transform((value) => value.toLowerCase()),
      phone: z.string().trim().max(30).optional(),
      password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
      bio: z.string().trim().max(500).optional(),
    }),
  ]),
});

export const updateBarberAccountSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    phone: z.union([z.string().trim().max(30), z.null()]).optional(),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).optional(),
  }).refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debes enviar al menos un dato para actualizar',
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

export const reportsQuerySchema = z.object({
  query: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>['body'];
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>['body'];
export type CreateBarberInput = z.infer<typeof createBarberSchema>['body'];
export type UpdateBarberAccountInput = z.infer<typeof updateBarberAccountSchema>['body'];
export type AdminAppointmentQuery = z.infer<
  typeof adminAppointmentQuerySchema
>['query'];
