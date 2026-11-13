import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portfolioApi, type PortfolioStatus } from '../api/portfolio.api';

export function usePublicPortfolio(limit = 24) {
  return useQuery({
    queryKey: ['portfolio', 'public', limit],
    queryFn: () => portfolioApi.listPublic(limit).then((r) => r.data),
  });
}

export function useBarberPortfolio(barberId: string) {
  return useQuery({
    queryKey: ['portfolio', 'barber', barberId],
    queryFn: () => portfolioApi.listForBarber(barberId).then((r) => r.data),
    enabled: !!barberId,
  });
}

export function useMyPortfolio(barberId: string) {
  return useQuery({
    queryKey: ['portfolio', 'mine', barberId],
    queryFn: () => portfolioApi.listMine(barberId).then((r) => r.data),
    enabled: !!barberId,
    staleTime: 0,
  });
}

export function useUploadPortfolioPhoto(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, caption }: { file: File; caption?: string }) =>
      portfolioApi.upload(barberId, file, caption).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}

export function useDeletePortfolioPhoto(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => portfolioApi.delete(barberId, photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}

export function usePortfolioReviewQueue(status?: PortfolioStatus) {
  return useQuery({
    queryKey: ['portfolio', 'review', status ?? 'ALL'],
    queryFn: () => portfolioApi.listForReview(status).then((r) => r.data),
    staleTime: 0,
  });
}

export function useReviewPortfolioPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, status }: { photoId: string; status: 'APPROVED' | 'REJECTED' }) =>
      portfolioApi.review(photoId, status).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}

/** Deletes any photo as admin (route takes the photo's barberId). */
export function useAdminDeletePortfolioPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ barberId, photoId }: { barberId: string; photoId: string }) =>
      portfolioApi.delete(barberId, photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });
}
