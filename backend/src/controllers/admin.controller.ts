import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as adminService from '../services/admin.service';
import * as serviceService from '../services/service.service';
import { adminAppointmentQuerySchema, type AdminAppointmentQuery } from '../schemas/admin.schema';

export async function getStats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.getStats());
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    res.json(await adminService.listUsers(page, limit));
  } catch (err) {
    next(err);
  }
}

export async function changeUserRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.changeUserRole(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function changeUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.changeUserStatus(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function createBarber(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const barber = await adminService.createBarberFromUser(req.body);
    res.status(201).json(barber);
  } catch (err) {
    next(err);
  }
}

export async function listAppointments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = adminAppointmentQuerySchema.parse({ query: req.query });
    res.json(await adminService.listAllAppointments(parsed.query));
  } catch (err) {
    next(err);
  }
}

export async function listServices(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await adminService.listAllServices());
  } catch (err) {
    next(err);
  }
}

export async function createService(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const service = await serviceService.createService(req.body);
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
}

export async function updateService(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await serviceService.updateService(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

export async function deleteService(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await serviceService.deleteService(req.params.id));
  } catch (err) {
    next(err);
  }
}
