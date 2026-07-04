import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createReviewSchema } from '../schemas/review.schema';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Reseñas y calificaciones de barberos
 */

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Dejar una reseña sobre una cita completada
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointmentId, rating]
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reseña creada
 *       400:
 *         description: La cita no está completada
 *       403:
 *         description: No es tu cita
 *       409:
 *         description: Ya reseñaste esta cita
 */
router.post('/', authenticate, authorize('CLIENT'), validate(createReviewSchema), reviewController.create);

/**
 * @swagger
 * /reviews/barber/{barberId}:
 *   get:
 *     summary: Listar reseñas y promedio de un barbero
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resumen y lista de reseñas
 */
router.get('/barber/:barberId', reviewController.listByBarber);

export default router;
