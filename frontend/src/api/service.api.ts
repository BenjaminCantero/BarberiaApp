import { api } from '../lib/axios';

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMin: number;
  price: string;
  isActive: boolean;
}

export const serviceApi = {
  list: () => api.get<Service[]>('/services'),
  getById: (id: string) => api.get<Service>(`/services/${id}`),
  create: (data: Omit<Service, 'id' | 'isActive'>) =>
    api.post<Service>('/services', data),
  update: (id: string, data: Partial<Omit<Service, 'id'>>) =>
    api.patch<Service>(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
};
