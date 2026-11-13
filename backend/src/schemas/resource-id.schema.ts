import { z } from 'zod';

// Prisma stores service IDs as text; existing demo data uses IDs such as svc-corte.
export const serviceIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'ID de servicio inválido');
