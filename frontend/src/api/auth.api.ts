import { api } from '../lib/axios';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string };
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<{ message: string; user: object }>('/auth/register', data),

  login: (data: LoginPayload) => api.post<AuthResponse>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  me: () =>
    api.get<{ id: string; name: string; email: string; role: string; phone?: string }>('/auth/me'),
};
