import { api } from '../lib/axios';

export interface RatingSummary {
  average: number;
  count: number;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  client: { name: string; avatarUrl?: string };
}

export interface BarberReviews {
  summary: RatingSummary;
  reviews: Review[];
}

export interface CreateReviewPayload {
  appointmentId: string;
  rating: number;
  comment?: string;
}

export const reviewApi = {
  create: (data: CreateReviewPayload) => api.post<Review>('/reviews', data),

  listByBarber: (barberId: string) => api.get<BarberReviews>(`/reviews/barber/${barberId}`),
};
