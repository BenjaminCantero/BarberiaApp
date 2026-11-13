import { z } from 'zod';
import { serviceIdSchema } from './resource-id.schema';
import { INSTAGRAM_HANDLE_RE, normalizeInstagram } from '../lib/instagram';

export const updateBarberSchema = z.object({
  body: z.object({
    bio: z.string().max(500).optional(),
    instagram: z
      .string()
      .max(100)
      .optional()
      .refine((v) => {
        const handle = normalizeInstagram(v);
        return handle == null || INSTAGRAM_HANDLE_RE.test(handle);
      }, 'Usuario de Instagram inválido'),
    isActive: z.boolean().optional(),
  }),
});

export const scheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  isActive: z.boolean().optional().default(true),
});

export const setScheduleSchema = z.object({
  body: z.object({
    schedule: z.array(scheduleEntrySchema).min(1),
  }),
});

export const availabilityQuerySchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido'),
    serviceId: serviceIdSchema.optional(),
  }),
});

export const assignServiceSchema = z.object({
  body: z.object({
    serviceId: serviceIdSchema,
  }),
});

export type UpdateBarberInput = z.infer<typeof updateBarberSchema>['body'];
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;
export type SetScheduleInput = z.infer<typeof setScheduleSchema>['body'];
