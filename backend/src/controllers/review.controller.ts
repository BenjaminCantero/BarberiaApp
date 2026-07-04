import { Request, Response, NextFunction } from 'express';
import * as reviewService from '../services/review.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await reviewService.createReview(
      req.user!.userId,
      req.body.appointmentId,
      req.body.rating,
      req.body.comment,
    );
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

export async function listByBarber(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reviewService.getBarberReviews(req.params.barberId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
