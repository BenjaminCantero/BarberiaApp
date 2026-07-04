import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid('appointmentId inválido'),
    rating: z.number().int().min(1, 'Mínimo 1 estrella').max(5, 'Máximo 5 estrellas'),
    comment: z.string().max(1000, 'El comentario es demasiado largo').optional(),
  }),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];
