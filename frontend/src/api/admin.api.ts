import { api } from '../lib/axios';
import type { UserProfile } from './user.api';
import type { Appointment } from './appointment.api';

export interface AdminStats {
  totalUsers: number;
  totalBarbers: number;
  appointments: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    total: number;
  };
}

export interface AdminUser extends UserProfile {
  barber?: { id: string; isActive: boolean } | null;
}

export interface PaginatedUsers {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedAppointments {
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminService {
  id: string;
  name: string;
  description?: string;
  durationMin: number;
  price: string;
  isActive: boolean;
}

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),

  listUsers: (page = 1, limit = 20) =>
    api.get<PaginatedUsers>('/admin/users', { params: { page, limit } }),

  changeRole: (userId: string, role: string) =>
    api.patch<AdminUser>(`/admin/users/${userId}/role`, { role }),

  changeStatus: (userId: string, isActive: boolean) =>
    api.patch<AdminUser>(`/admin/users/${userId}/status`, { isActive }),

  createBarber: (userId: string, bio?: string) =>
    api.post('/admin/barbers', { userId, bio }),

  listAppointments: (params?: {
    status?: string;
    barberId?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedAppointments>('/admin/appointments', { params }),

  listServices: () => api.get<AdminService[]>('/admin/services'),

  createService: (data: {
    name: string;
    description?: string;
    durationMin: number;
    price: number;
  }) => api.post<AdminService>('/admin/services', data),

  updateService: (
    id: string,
    data: {
      name?: string;
      description?: string;
      durationMin?: number;
      price?: number;
      isActive?: boolean;
    },
  ) => api.patch<AdminService>(`/admin/services/${id}`, data),

  deleteService: (id: string) => api.delete(`/admin/services/${id}`),
};
