import { api } from '../lib/axios';

export interface Certificate {
  id: string;
  barberId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  createdAt: string;
}

export const certificateApi = {
  list: (barberId: string) =>
    api.get<Certificate[]>(`/barbers/${barberId}/certificates`),

  upload: (barberId: string, file: File, title: string, description?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    if (description) form.append('description', description);
    return api.post<Certificate>(`/barbers/${barberId}/certificates`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (barberId: string, certId: string) =>
    api.delete(`/barbers/${barberId}/certificates/${certId}`),
};
