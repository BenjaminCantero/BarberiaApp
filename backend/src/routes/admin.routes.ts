import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  changeRoleSchema,
  changeStatusSchema,
  createBarberSchema,
  adminAppointmentQuerySchema,
} from '../schemas/admin.schema';
import { createServiceSchema, updateServiceSchema } from '../schemas/service.schema';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Todos los endpoints requieren ADMIN
router.use(authenticate, authorize('ADMIN'));

// Estadísticas
router.get('/stats', adminController.getStats);

// Usuarios
router.get('/users', adminController.listUsers);
router.patch('/users/:id/role', validate(changeRoleSchema), adminController.changeUserRole);
router.patch('/users/:id/status', validate(changeStatusSchema), adminController.changeUserStatus);

// Crear barbero desde usuario existente
router.post('/barbers', validate(createBarberSchema), adminController.createBarber);

// Todas las citas
router.get('/appointments', validate(adminAppointmentQuerySchema), adminController.listAppointments);

// Servicios (admin ve todos, incluso inactivos)
router.get('/services', adminController.listServices);
router.post('/services', validate(createServiceSchema), adminController.createService);
router.patch('/services/:id', validate(updateServiceSchema), adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

export default router;
