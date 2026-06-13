import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentApi, type AppointmentStatus, type CreateAppointmentPayload } from '../api/appointment.api';

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
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' }) =>
      appointmentApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
