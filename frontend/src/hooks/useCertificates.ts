import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { certificateApi } from '../api/certificate.api';

export function useCertificates(barberId: string) {
  return useQuery({
    queryKey: ['certificates', barberId],
    queryFn: () => certificateApi.list(barberId).then((r) => r.data),
    enabled: !!barberId,
    staleTime: 60_000,
  });
}

export function useUploadCertificate(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      title,
      description,
    }: {
      file: File;
      title: string;
      description?: string;
    }) => certificateApi.upload(barberId, file, title, description).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates', barberId] }),
  });
}

export function useDeleteCertificate(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certId: string) =>
      certificateApi.delete(barberId, certId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates', barberId] }),
  });
}
