import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reviewApi, type CreateReviewPayload } from '../api/review.api';
import { getApiErrorMessage } from '../lib/errors';

export function useBarberReviews(barberId: string) {
  return useQuery({
    queryKey: ['reviews', barberId],
    queryFn: () => reviewApi.listByBarber(barberId).then((r) => r.data),
    enabled: Boolean(barberId),
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReviewPayload) => reviewApi.create(data).then((r) => r.data),
    onSuccess: () => {
      toast.success('¡Gracias por tu reseña!');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo enviar la reseña'));
    },
  });
}
