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

const civilDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD requerido');
const wallTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM requerido');

export const scheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: wallTime,
  endTime: wallTime,
  isActive: z.boolean().optional().default(true),
});

export const setScheduleSchema = z.object({
  body: z.object({
    // Vacío = el barbero no atiende ningún día (p. ej. de baja temporal).
    // Varias entradas con el mismo dayOfWeek = tramos con pausa entre medio.
    schedule: z.array(scheduleEntrySchema).max(42),
  }),
});

export const createBlockSchema = z.object({
  body: z
    .object({
      startDate: civilDate,
      endDate: civilDate.optional(),
      // Sin horas = días completos. Con horas = solo ese tramo de un único día.
      startTime: wallTime.optional(),
      endTime: wallTime.optional(),
      reason: z.string().trim().max(120).optional(),
    })
    .refine((b) => !b.endDate || b.endDate >= b.startDate, {
      message: 'La fecha final debe ser igual o posterior a la inicial',
      path: ['endDate'],
    })
    .refine((b) => (b.startTime === undefined) === (b.endTime === undefined), {
      message: 'Indica hora de inicio y de fin, o ninguna para bloquear el día completo',
      path: ['endTime'],
    })
    .refine((b) => !b.startTime || !b.endDate || b.endDate === b.startDate, {
      message: 'Un bloqueo por horas debe ser de un solo día',
      path: ['endDate'],
    })
    .refine((b) => !b.startTime || !b.endTime || b.startTime < b.endTime, {
      message: 'La hora de inicio debe ser anterior a la de fin',
      path: ['endTime'],
    }),
});

export const listBlocksQuerySchema = z.object({
  query: z.object({
    from: civilDate.optional(),
    to: civilDate.optional(),
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
export type CreateBlockInput = z.infer<typeof createBlockSchema>['body'];
export type SetScheduleInput = z.infer<typeof setScheduleSchema>['body'];
