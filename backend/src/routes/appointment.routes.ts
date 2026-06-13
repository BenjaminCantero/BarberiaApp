import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  createAppointmentSchema,
  updateStatusSchema,
  listAppointmentsQuerySchema,
} from '../schemas/appointment.schema';

const router = Router();

// Todas las rutas de citas requieren autenticación
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Gestión de citas
 */

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Crear una nueva reserva (solo clientes)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [barberId, serviceId, startAt]
 *             properties:
 *               barberId:
 *                 type: string
 *                 format: uuid
 *               serviceId:
 *                 type: string
 *                 format: uuid
 *               startAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-06-20T10:00:00.000Z"
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cita creada con estado PENDING
 *       400:
 *         description: Horario fuera de turno o datos inválidos
 *       409:
 *         description: Slot ya ocupado
 */
router.post(
  '/',
  authorize('CLIENT'),
  validate(createAppointmentSchema),
  appointmentController.create,
);

/**
 * @swagger
 * /appointments/my:
 *   get:
 *     summary: Listar mis citas (cliente ve las suyas, barbero las de su agenda)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           example: "2026-06-20"
 *     responses:
 *       200:
 *         description: Lista de citas ordenadas por fecha
 */
router.get(
  '/my',
  authorize('CLIENT', 'BARBER', 'ADMIN'),
  validate(listAppointmentsQuerySchema),
  appointmentController.listMine,
);

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: Obtener detalle de una cita
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detalle de la cita
 *       403:
 *         description: Sin acceso
 *       404:
 *         description: Cita no encontrada
 */
router.get('/:id', authorize('CLIENT', 'BARBER', 'ADMIN'), appointmentController.getOne);

/**
 * @swagger
 * /appointments/{id}/status:
 *   patch:
 *     summary: Cambiar estado de una cita
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Transiciones permitidas:
 *       - PENDING → CONFIRMED (barbero/admin)
 *       - PENDING → CANCELLED (cliente/barbero/admin)
 *       - CONFIRMED → COMPLETED (barbero/admin)
 *       - CONFIRMED → CANCELLED (cliente con ≥2h antelación, barbero/admin)
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
 *               status:
 *                 type: string
 *                 enum: [CONFIRMED, CANCELLED, COMPLETED]
 *     responses:
 *       200:
 *         description: Cita actualizada
 *       400:
 *         description: Transición inválida o regla de negocio violada
 */
router.patch(
  '/:id/status',
  authorize('CLIENT', 'BARBER', 'ADMIN'),
  validate(updateStatusSchema),
  appointmentController.updateStatus,
);

export default router;
