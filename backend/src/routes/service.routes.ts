import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createServiceSchema, updateServiceSchema } from '../schemas/service.schema';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Gestión de servicios de la barbería
 */

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Listar todos los servicios activos
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Lista de servicios
 */
router.get('/', serviceController.listServices);

/**
 * @swagger
 * /services/{id}:
 *   get:
 *     summary: Obtener detalle de un servicio
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detalle del servicio
 *       404:
 *         description: Servicio no encontrado
 */
router.get('/:id', serviceController.getService);

/**
 * @swagger
 * /services:
 *   post:
 *     summary: Crear un nuevo servicio (solo admin)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, durationMin, price]
 *             properties:
 *               name:        { type: string, example: "Corte clásico" }
 *               description: { type: string }
 *               durationMin: { type: integer, example: 30 }
 *               price:       { type: number, example: 15.00 }
 *     responses:
 *       201:
 *         description: Servicio creado
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createServiceSchema),
  serviceController.createService,
);

/**
 * @swagger
 * /services/{id}:
 *   patch:
 *     summary: Actualizar un servicio (solo admin)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Servicio actualizado
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateServiceSchema),
  serviceController.updateService,
);

/**
 * @swagger
 * /services/{id}:
 *   delete:
 *     summary: Desactivar un servicio (solo admin, soft delete)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Servicio desactivado
 */
router.delete('/:id', authenticate, authorize('ADMIN'), serviceController.deleteService);

export default router;
