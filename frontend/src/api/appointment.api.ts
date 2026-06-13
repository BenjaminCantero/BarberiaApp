import { api } from '../lib/axios';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  client: { id: string; name: string; email: string; phone?: string };
  barber: { id: string; user: { name: string; email: string; phone?: string } };
  service: { id: string; name: string; durationMin: number; price: string };
}

export interface CreateAppointmentPayload {
  barberId: string;
  serviceId: string;
  startAt: string;
  notes?: string;
}

export const appointmentApi = {
  create: (data: CreateAppointmentPayload) =>
    api.post<Appointment>('/appointments', data),

  listMine: (params?: { status?: AppointmentStatus; date?: string }) =>
    api.get<Appointment[]>('/appointments/my', { params }),

  getById: (id: string) =>
    api.get<Appointment>(`/appointments/${id}`),

  updateStatus: (id: string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') =>
    api.patch<Appointment>(`/appointments/${id}/status`, { status }),
};
