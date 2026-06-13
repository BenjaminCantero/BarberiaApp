import { Router } from 'express';
import * as barberController from '../controllers/barber.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  updateBarberSchema,
  setScheduleSchema,
  availabilityQuerySchema,
  assignServiceSchema,
} from '../schemas/barber.schema';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Barbers
 *   description: Gestión de barberos, horarios y disponibilidad
 */

/**
 * @swagger
 * /barbers/me:
 *   get:
 *     summary: Obtener el perfil del barbero autenticado
 *     tags: [Barbers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil completo del barbero con servicios y horario
 *       404:
 *         description: Perfil de barbero no encontrado para este usuario
 */
router.get('/me', authenticate, authorize('BARBER', 'ADMIN'), barberController.getMyBarber);

/**
 * @swagger
 * /barbers:
 *   get:
 *     summary: Listar todos los barberos activos
 *     tags: [Barbers]
 *     responses:
 *       200:
 *         description: Lista de barberos con sus servicios
 */
router.get('/', barberController.listBarbers);

/**
 * @swagger
 * /barbers/{id}:
 *   get:
 *     summary: Obtener perfil completo de un barbero
 *     tags: [Barbers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Perfil del barbero con servicios y horario
 *       404:
 *         description: Barbero no encontrado
 */
router.get('/:id', barberController.getBarber);

/**
 * @swagger
 * /barbers/{id}:
 *   patch:
 *     summary: Actualizar perfil de barbero (propio barbero o admin)
 *     tags: [Barbers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Barbero actualizado
 */
router.patch(
  '/:id',
  authenticate,
  authorize('BARBER', 'ADMIN'),
  validate(updateBarberSchema),
  barberController.updateBarber,
);

/**
 * @swagger
 * /barbers/{id}/schedule:
 *   get:
 *     summary: Obtener horario del barbero
 *     tags: [Barbers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de entradas de horario
 */
router.get('/:id/schedule', barberController.getSchedule);

/**
 * @swagger
 * /barbers/{id}/schedule:
 *   put:
 *     summary: Reemplazar horario completo del barbero
 *     tags: [Barbers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schedule:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek: { type: integer, minimum: 0, maximum: 6 }
 *                     startTime: { type: string, example: "09:00" }
 *                     endTime:   { type: string, example: "18:00" }
 *                     isActive:  { type: boolean }
 *     responses:
 *       200:
 *         description: Horario actualizado
 */
router.put(
  '/:id/schedule',
  authenticate,
  authorize('BARBER', 'ADMIN'),
  validate(setScheduleSchema),
  barberController.setSchedule,
);

/**
 * @swagger
 * /barbers/{id}/availability:
 *   get:
 *     summary: Obtener slots disponibles para una fecha
 *     tags: [Barbers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, example: "2026-06-15" }
 *       - in: query
 *         name: serviceId
 *         schema: { type: string, format: uuid }
 *         description: ID del servicio para ajustar duración del slot
 *     responses:
 *       200:
 *         description: Lista de slots disponibles con hora inicio/fin
 */
router.get(
  '/:id/availability',
  validate(availabilityQuerySchema),
  barberController.getAvailability,
);

/**
 * @swagger
 * /barbers/{id}/services:
 *   post:
 *     summary: Asignar un servicio a un barbero
 *     tags: [Barbers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Servicio asignado
 *       409:
 *         description: El servicio ya estaba asignado
 */
router.post(
  '/:id/services',
  authenticate,
  authorize('BARBER', 'ADMIN'),
  validate(assignServiceSchema),
  barberController.assignService,
);

/**
 * @swagger
 * /barbers/{id}/services/{serviceId}:
 *   delete:
 *     summary: Remover un servicio de un barbero
 *     tags: [Barbers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Servicio removido
 */
router.delete(
  '/:id/services/:serviceId',
  authenticate,
  authorize('BARBER', 'ADMIN'),
  barberController.removeService,
);

export default router;
