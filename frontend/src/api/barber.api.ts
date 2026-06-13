import { api } from '../lib/axios';

export interface BarberService {
  service: { id: string; name: string; durationMin: number; price: string; description?: string };
}

export interface Schedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface Barber {
  id: string;
  bio?: string;
  isActive: boolean;
  user: { name: string; email: string; phone?: string; avatarUrl?: string };
  services: BarberService[];
  schedules?: Schedule[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
}

export interface ScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export const barberApi = {
  list: () => api.get<Barber[]>('/barbers'),

  getById: (id: string) => api.get<Barber>(`/barbers/${id}`),

  getMe: () => api.get<Barber>('/barbers/me'),

  update: (id: string, data: { bio?: string; isActive?: boolean }) =>
    api.patch<Barber>(`/barbers/${id}`, data),

  getSchedule: (id: string) => api.get<Schedule[]>(`/barbers/${id}/schedule`),

  setSchedule: (id: string, schedule: ScheduleEntry[]) =>
    api.put(`/barbers/${id}/schedule`, { schedule }),

  getAvailability: (id: string, date: string, serviceId?: string) =>
    api.get<TimeSlot[]>(`/barbers/${id}/availability`, {
      params: { date, serviceId },
    }),

  assignService: (id: string, serviceId: string) =>
    api.post(`/barbers/${id}/services`, { serviceId }),

  removeService: (id: string, serviceId: string) =>
    api.delete(`/barbers/${id}/services/${serviceId}`),
};
