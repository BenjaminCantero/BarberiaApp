import { api } from '../lib/axios';

export type PortfolioStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PortfolioPhoto {
  id: string;
  barberId: string;
  imageUrl: string;
  caption: string | null;
  status: PortfolioStatus;
  reviewedAt: string | null;
  createdAt: string;
  barber?: { id: string; user: { name: string; avatarUrl: string | null } };
}

export const portfolioApi = {
  /** Galería pública: fotos aprobadas de todos los barberos. */
  listPublic: (limit = 24) => api.get<PortfolioPhoto[]>('/portfolio', { params: { limit } }),

  /** Fotos aprobadas de un barbero. */
  listForBarber: (barberId: string) => api.get<PortfolioPhoto[]>(`/barbers/${barberId}/portfolio`),

  /** Todas las fotos del barbero, con estado (dueño o admin). */
  listMine: (barberId: string) => api.get<PortfolioPhoto[]>(`/barbers/${barberId}/portfolio/mine`),

  upload: (barberId: string, file: File, caption?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    return api.post<PortfolioPhoto>(`/barbers/${barberId}/portfolio`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (barberId: string, photoId: string) => api.delete(`/barbers/${barberId}/portfolio/${photoId}`),

  /** Admin: cola de moderación. */
  listForReview: (status?: PortfolioStatus) =>
    api.get<PortfolioPhoto[]>('/admin/portfolio', { params: status ? { status } : {} }),

  review: (photoId: string, status: 'APPROVED' | 'REJECTED') =>
    api.patch<PortfolioPhoto>(`/admin/portfolio/${photoId}`, { status }),
};
