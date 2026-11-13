import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/error.middleware';
import * as portfolioService from '../services/portfolio.service';
import * as barberService from '../services/barber.service';
import { storeUpload, deleteUpload } from '../lib/storage';

/** Verifica que el usuario sea el barbero dueño del perfil o un admin. */
async function assertOwnerOrAdmin(req: AuthRequest, barberId: string) {
  if (req.user!.role === 'ADMIN') return;
  const barber = await barberService.getBarberById(barberId);
  if (barber.userId !== req.user!.userId) {
    throw new AppError(403, 'Sin permisos sobre el portafolio de este barbero');
  }
}

function parseLimit(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** GET /api/portfolio — mix público de fotos aprobadas. */
export async function listPublic(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await portfolioService.listPublicPortfolio({ limit: parseLimit(req.query.limit) }));
  } catch (err) {
    next(err);
  }
}

/** GET /api/barbers/:id/portfolio — fotos aprobadas de un barbero. */
export async function listForBarber(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(
      await portfolioService.listPublicPortfolio({ barberId: req.params.id, limit: parseLimit(req.query.limit) }),
    );
  } catch (err) {
    next(err);
  }
}

/** GET /api/barbers/:id/portfolio/mine — todas las fotos (dueño o admin). */
export async function listMine(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await assertOwnerOrAdmin(req, req.params.id);
    res.json(await portfolioService.listBarberPortfolio(req.params.id));
  } catch (err) {
    next(err);
  }
}

/** POST /api/barbers/:id/portfolio — subir foto (multipart, campo "file"). */
export async function upload(req: AuthRequest, res: Response, next: NextFunction) {
  let imageUrl: string | null = null;
  try {
    if (!req.file) throw new AppError(400, 'No se recibió ninguna imagen');
    await assertOwnerOrAdmin(req, req.params.id);
    imageUrl = await storeUpload(req.file, 'portfolio');

    const { caption } = req.body as { caption?: string };
    const photo = await portfolioService.createPortfolioPhoto({
      barberId: req.params.id,
      imageUrl,
      caption,
      autoApprove: req.user!.role === 'ADMIN',
    });
    res.status(201).json(photo);
  } catch (err) {
    // Si falló algo después de guardar el archivo, no dejar huérfanos.
    if (imageUrl) await deleteUpload(imageUrl);
    next(err);
  }
}

/** DELETE /api/barbers/:id/portfolio/:photoId */
export async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await assertOwnerOrAdmin(req, req.params.id);
    const ownerScope = req.user!.role === 'ADMIN' ? null : req.params.id;
    await portfolioService.deletePortfolioPhoto(req.params.photoId, ownerScope);
    res.json({ message: 'Foto eliminada' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/portfolio?status=PENDING */
export async function listForReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
    res.json(await portfolioService.listPortfolioForReview(status));
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/admin/portfolio/:photoId  { status } */
export async function review(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body as { status: 'APPROVED' | 'REJECTED' };
    res.json(await portfolioService.reviewPortfolioPhoto(req.params.photoId, status));
  } catch (err) {
    next(err);
  }
}
