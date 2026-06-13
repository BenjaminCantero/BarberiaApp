import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { barberApi, type ScheduleEntry } from '../api/barber.api';

export function useMyBarber() {
  return useQuery({
    queryKey: ['barbers', 'me'],
    queryFn: () => barberApi.getMe().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBarbers() {
  return useQuery({
    queryKey: ['barbers'],
    queryFn: () => barberApi.list().then((r) => r.data),
  });
}

export function useBarber(id: string) {
  return useQuery({
    queryKey: ['barbers', id],
    queryFn: () => barberApi.getById(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useBarberSchedule(id: string) {
  return useQuery({
    queryKey: ['barbers', id, 'schedule'],
    queryFn: () => barberApi.getSchedule(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAvailability(barberId: string, date: string, serviceId?: string) {
  return useQuery({
    queryKey: ['availability', barberId, date, serviceId],
    queryFn: () => barberApi.getAvailability(barberId, date, serviceId).then((r) => r.data),
    enabled: !!barberId && !!date && !!serviceId,
    staleTime: 30_000,
  });
}

export function useSetSchedule(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (schedule: ScheduleEntry[]) => barberApi.setSchedule(barberId, schedule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barbers', barberId] });
      qc.invalidateQueries({ queryKey: ['barbers', barberId, 'schedule'] });
    },
  });
}
