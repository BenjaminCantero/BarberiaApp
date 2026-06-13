import { z } from 'zod';

export const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    description: z.string().max(300).optional(),
    durationMin: z
      .number()
      .int()
      .min(10, 'Duración mínima 10 minutos')
      .max(240, 'Duración máxima 4 horas'),
    price: z.number().positive('El precio debe ser positivo'),
  }),
});

export const updateServiceSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().max(300).optional(),
    durationMin: z.number().int().min(10).max(240).optional(),
    price: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>['body'];
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>['body'];
