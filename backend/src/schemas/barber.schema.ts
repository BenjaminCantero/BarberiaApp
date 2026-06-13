import { z } from 'zod';

export const updateBarberSchema = z.object({
  body: z.object({
    bio: z.string().max(500).optional(),
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
    serviceId: z.string().uuid().optional(),
  }),
});

export const assignServiceSchema = z.object({
  body: z.object({
    serviceId: z.string().uuid(),
  }),
});

export type UpdateBarberInput = z.infer<typeof updateBarberSchema>['body'];
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;
export type SetScheduleInput = z.infer<typeof setScheduleSchema>['body'];
