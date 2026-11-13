import { Router } from 'express';
import * as barberController from '../controllers/barber.controller';
import * as certController from '../controllers/certificate.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { certificateUpload, portfolioUpload } from '../lib/upload';
import * as portfolioController from '../controllers/portfolio.controller';
import {
  updateBarberSchema,
  setScheduleSchema,
  availabilityQuerySchema,
  assignServiceSchema,
  createBlockSchema,
  listBlocksQuerySchema,
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
 *               instagram: { type: string, description: "Usuario, @usuario o URL del perfil; vacío lo borra" }
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
 *         description: Horario actualizado; `cancelled` = citas futuras fuera del nuevo turno que se cancelaron (con aviso al cliente)
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
 * /barbers/{id}/blocks:
 *   get:
 *     summary: Bloqueos de agenda vigentes (vacaciones, días libres, horas puntuales)
 *     tags: [Barbers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: from, schema: { type: string, example: "2026-12-01" } }
 *       - { in: query, name: to, schema: { type: string, example: "2026-12-31" } }
 *   post:
 *     summary: Bloquear días completos (startDate..endDate) o un tramo horario de un día
 *     tags: [Barbers]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startDate]
 *             properties:
 *               startDate: { type: string, example: "2026-12-24" }
 *               endDate:   { type: string, example: "2026-12-31" }
 *               startTime: { type: string, example: "10:00" }
 *               endTime:   { type: string, example: "12:00" }
 *               reason:    { type: string, example: "Vacaciones" }
 *     responses:
 *       201:
 *         description: Bloqueo creado; `cancelled` = citas activas dentro del bloqueo que se cancelaron (con aviso al cliente)
 * /barbers/{id}/blocks/{blockId}:
 *   delete:
 *     summary: Eliminar un bloqueo
 *     tags: [Barbers]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/blocks', authenticate, authorize('BARBER', 'ADMIN'), validate(listBlocksQuerySchema), barberController.listBlocks);
router.post('/:id/blocks', authenticate, authorize('BARBER', 'ADMIN'), validate(createBlockSchema), barberController.createBlock);
router.delete('/:id/blocks/:blockId', authenticate, authorize('BARBER', 'ADMIN'), barberController.deleteBlock);

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
 *       404:
 *         description: Barbero inactivo/inexistente, o servicio que el barbero no ofrece
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

// Certificados / diplomas
router.get('/:id/certificates', certController.list);

router.post(
  '/:id/certificates',
  authenticate,
  authorize('BARBER', 'ADMIN'),
  certificateUpload.single('file'),
  certController.upload,
);

router.delete(
  '/:id/certificates/:certId',
  authenticate,
  authorize('BARBER', 'ADMIN'),
  certController.remove,
);

// Portafolio de trabajos
/**
 * @swagger
 * /barbers/{id}/portfolio:
 *   get:
 *     summary: Fotos aprobadas del portafolio de un barbero
 *     tags: [Portafolio]
 *   post:
 *     summary: Subir foto al portafolio (barbero dueño queda PENDING; admin queda APPROVED)
 *     tags: [Portafolio]
 *     security: [{ bearerAuth: [] }]
 * /barbers/{id}/portfolio/mine:
 *   get:
 *     summary: Todas las fotos del barbero con su estado (dueño o admin)
 *     tags: [Portafolio]
 *     security: [{ bearerAuth: [] }]
 * /barbers/{id}/portfolio/{photoId}:
 *   delete:
 *     summary: Eliminar foto del portafolio
 *     tags: [Portafolio]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/portfolio', portfolioController.listForBarber);
router.get('/:id/portfolio/mine', authenticate, authorize('BARBER', 'ADMIN'), portfolioController.listMine);
router.post(
  '/:id/portfolio',
  authenticate,
  authorize('BARBER', 'ADMIN'),
  portfolioUpload.single('file'),
  portfolioController.upload,
);
router.delete('/:id/portfolio/:photoId', authenticate, authorize('BARBER', 'ADMIN'), portfolioController.remove);

export default router;
