import { z } from 'zod';

const statusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const portfolioReviewQuerySchema = z.object({
  query: z.object({ status: statusEnum.optional() }),
});

export const portfolioReviewSchema = z.object({
  params: z.object({ photoId: z.string().uuid('ID de foto inválido') }),
  body: z.object({ status: z.enum(['APPROVED', 'REJECTED']) }),
});
