import { Response, NextFunction } from 'express';
import { AppointmentStatus } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as appointmentService from '../services/appointment.service';

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointment = await appointmentService.createAppointment(req.user!.userId, req.body);
    res.status(201).json(appointment);
  } catch (err) { next(err); }
}

export async function listMine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, date } = req.query as { status?: string; date?: string };
    const appointments = await appointmentService.getMyAppointments(
      req.user!.userId,
      req.user!.role,
      { status: status as AppointmentStatus | undefined, date },
    );
    res.json(appointments);
  } catch (err) { next(err); }
}

export async function getOne(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointment = await appointmentService.getAppointmentById(
      req.params.id,
      req.user!.userId,
      req.user!.role,
    );
    res.json(appointment);
  } catch (err) { next(err); }
}

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await appointmentService.updateAppointmentStatus(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.body.status as AppointmentStatus,
    );
    res.json(updated);
  } catch (err) { next(err); }
}
