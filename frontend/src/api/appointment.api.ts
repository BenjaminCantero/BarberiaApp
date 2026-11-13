import { api } from '../lib/axios';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  client: { id: string | null; name: string; email: string; phone?: string | null };
  barber: { id: string; user: { name: string; email: string; phone?: string } };
  service: { id: string; name: string; durationMin: number; price: string };
  review?: { id: string; rating: number } | null;
}

export interface CreateAppointmentPayload {
  name: string;
  email: string;
  phone?: string;
  barberId: string;
  serviceId: string;
  startAt: string;
  notes?: string;
}

export const appointmentApi = {
  create: (data: CreateAppointmentPayload) =>
    api.post<{ id: string; startAt: string; status: AppointmentStatus }>('/appointments/guest', data),

  listMine: (params?: { status?: AppointmentStatus; date?: string; from?: string; to?: string }) =>
    api.get<Appointment[]>('/appointments/my', { params }),

  getById: (id: string) =>
    api.get<Appointment>(`/appointments/${id}`),

  updateStatus: (id: string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') =>
    api.patch<Appointment>(`/appointments/${id}/status`, { status }),

  reschedule: (id: string, startAt: string) =>
    api.patch<Appointment>(`/appointments/${id}/reschedule`, { startAt }),
};
