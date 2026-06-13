import { api } from '../lib/axios';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export const userApi = {
  getMe: () => api.get<UserProfile>('/users/me'),

  updateMe: (data: { name?: string; phone?: string | null }) =>
    api.patch<UserProfile>('/users/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch<{ message: string }>('/users/me/password', data),
};
