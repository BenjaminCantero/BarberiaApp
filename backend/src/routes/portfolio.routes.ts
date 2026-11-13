import { Router } from 'express';
import * as portfolioController from '../controllers/portfolio.controller';

const router = Router();

/**
 * @swagger
 * /portfolio:
 *   get:
 *     summary: Galería pública (fotos aprobadas de todos los barberos)
 *     tags: [Portafolio]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, maximum: 48, default: 24 }
 *     responses:
 *       200:
 *         description: Lista de fotos aprobadas con datos del barbero
 */
router.get('/', portfolioController.listPublic);

export default router;
