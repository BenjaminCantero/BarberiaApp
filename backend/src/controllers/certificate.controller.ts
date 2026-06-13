import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import * as certService from '../services/certificate.service';
import * as barberService from '../services/barber.service';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const certs = await certService.listCertificates(req.params.id);
    res.json(certs);
  } catch (err) {
    next(err);
  }
}

export async function upload(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError(400, 'No se recibió ningún archivo');

    const { title, description } = req.body as { title?: string; description?: string };
    if (!title?.trim()) throw new AppError(400, 'El título es obligatorio');

    const barberId = req.params.id;

    // Verificar que el barbero existe y el solicitante tiene permisos
    const barber = await barberService.getBarberById(barberId);
    if (req.user!.role !== 'ADMIN' && barber.userId !== req.user!.userId) {
      throw new AppError(403, 'Sin permisos para subir archivos a este barbero');
    }

    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
    const fileUrl = `/uploads/${req.file.filename}`;

    const cert = await certService.createCertificate(
      barberId,
      title.trim(),
      description?.trim() || undefined,
      fileUrl,
      fileType,
    );

    res.status(201).json(cert);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const barberId = req.params.id;
    const certId = req.params.certId;

    // Admin puede borrar cualquiera; barbero solo los suyos (verificado en service)
    if (req.user!.role !== 'ADMIN') {
      const barber = await barberService.getBarberById(barberId);
      if (barber.userId !== req.user!.userId) {
        throw new AppError(403, 'Sin permisos para eliminar este certificado');
      }
    }

    await certService.deleteCertificate(certId, barberId);
    res.json({ message: 'Certificado eliminado' });
  } catch (err) {
    next(err);
  }
}
