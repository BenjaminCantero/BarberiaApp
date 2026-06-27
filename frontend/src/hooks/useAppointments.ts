import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { appointmentApi, type AppointmentStatus, type CreateAppointmentPayload } from '../api/appointment.api';
import { getApiErrorMessage } from '../lib/errors';

export function useMyAppointments(filters?: { status?: AppointmentStatus; date?: string }) {
  return useQuery({
    queryKey: ['appointments', 'my', filters],
    queryFn: () => appointmentApi.listMine(filters).then((r) => r.data),
    staleTime: 30_000,
    // Refresca automáticamente cuando la ventana vuelve a tener foco
    refetchOnWindowFocus: true,
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => appointmentApi.getById(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointmentPayload) => appointmentApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Reserva creada. Te avisaremos cuando el barbero la confirme.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo crear la reserva')),
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' }) =>
      appointmentApi.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
      const labels: Record<string, string> = {
        CONFIRMED: 'Cita confirmada',
        CANCELLED: 'Cita cancelada',
        COMPLETED: 'Cita marcada como completada',
      };
      toast.success(labels[variables.status] ?? 'Cita actualizada');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo actualizar la cita')),
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, startAt }: { id: string; startAt: string }) =>
      appointmentApi.reschedule(id, startAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Cita reprogramada');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo reprogramar la cita')),
  });
}
