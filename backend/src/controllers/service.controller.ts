import { Request, Response, NextFunction } from 'express';
import * as serviceService from '../services/service.service';

export async function listServices(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await serviceService.listServices());
  } catch (err) { next(err); }
}

export async function getService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await serviceService.getServiceById(req.params.id));
  } catch (err) { next(err); }
}

export async function createService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const service = await serviceService.createService(req.body);
    res.status(201).json(service);
  } catch (err) { next(err); }
}

export async function updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await serviceService.updateService(req.params.id, req.body));
  } catch (err) { next(err); }
}

export async function deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await serviceService.deleteService(req.params.id);
    res.json({ message: 'Servicio desactivado' });
  } catch (err) { next(err); }
}
