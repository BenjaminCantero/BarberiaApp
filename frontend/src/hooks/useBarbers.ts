import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { barberApi, type CreateBlockPayload, type ScheduleEntry } from '../api/barber.api';
import { getApiErrorMessage } from '../lib/errors';

export function useMyBarber(enabled = true) {
  return useQuery({
    queryKey: ['barbers', 'me'],
    queryFn: () => barberApi.getMe().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled,
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
      qc.invalidateQueries({ queryKey: ['availability', barberId] });
      toast.success('Horario guardado');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo guardar el horario')),
  });
}

export function useScheduleBlocks(barberId: string, range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['barbers', barberId, 'blocks', range],
    queryFn: () => barberApi.listBlocks(barberId, range).then((r) => r.data),
    enabled: !!barberId,
  });
}

export function useCreateBlock(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBlockPayload) => barberApi.createBlock(barberId, data).then((r) => r.data),
    onSuccess: ({ conflicts }) => {
      qc.invalidateQueries({ queryKey: ['barbers', barberId, 'blocks'] });
      qc.invalidateQueries({ queryKey: ['availability', barberId] });
      if (conflicts > 0) {
        toast.warning(`Bloqueo guardado. Tienes ${conflicts} cita${conflicts > 1 ? 's' : ''} activa${conflicts > 1 ? 's' : ''} en ese periodo: revísala${conflicts > 1 ? 's' : ''} en la agenda.`);
      } else {
        toast.success('Bloqueo guardado');
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo guardar el bloqueo')),
  });
}

export function useDeleteBlock(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) => barberApi.deleteBlock(barberId, blockId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barbers', barberId, 'blocks'] });
      qc.invalidateQueries({ queryKey: ['availability', barberId] });
      toast.success('Bloqueo eliminado');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo eliminar el bloqueo')),
  });
}

export function useUpdateBarber(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { bio?: string; instagram?: string }) => barberApi.update(barberId, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbers'] }),
  });
}
