import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as barberService from '../services/barber.service';

export async function getMyBarber(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const barber = await barberService.getMyBarber(req.user!.userId);
    res.json(barber);
  } catch (err) { next(err); }
}

export async function listBarbers(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const barbers = await barberService.listBarbers();
    res.json(barbers);
  } catch (err) { next(err); }
}

export async function getBarber(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const barber = await barberService.getBarberById(req.params.id);
    res.json(barber);
  } catch (err) { next(err); }
}

export async function updateBarber(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const barber = await barberService.updateBarber(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.body,
    );
    res.json(barber);
  } catch (err) { next(err); }
}

export async function getSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedule = await barberService.getSchedule(req.params.id);
    res.json(schedule);
  } catch (err) { next(err); }
}

export async function setSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await barberService.setSchedule(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.body,
    );
    res.json({ message: `Horario actualizado (${result.count} entradas)`, cancelled: result.cancelled });
  } catch (err) { next(err); }
}

export async function listBlocks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const blocks = await barberService.listBlocks(req.params.id, req.user!.userId, req.user!.role, { from, to });
    res.json(blocks);
  } catch (err) { next(err); }
}

export async function createBlock(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await barberService.createBlock(req.params.id, req.user!.userId, req.user!.role, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function deleteBlock(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await barberService.deleteBlock(req.params.id, req.params.blockId, req.user!.userId, req.user!.role);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function getAvailability(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, serviceId } = req.query as { date: string; serviceId?: string };
    const slots = await barberService.getAvailableSlots(req.params.id, date, serviceId);
    res.json(slots);
  } catch (err) { next(err); }
}

export async function assignService(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await barberService.assignService(
      req.params.id,
      req.body.serviceId,
      req.user!.userId,
      req.user!.role,
    );
    res.status(201).json({ message: 'Servicio asignado al barbero' });
  } catch (err) { next(err); }
}

export async function removeService(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await barberService.removeService(
      req.params.id,
      req.params.serviceId,
      req.user!.userId,
      req.user!.role,
    );
    res.json({ message: 'Servicio removido del barbero' });
  } catch (err) { next(err); }
}
