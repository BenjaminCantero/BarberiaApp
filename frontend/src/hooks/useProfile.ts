import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import { useAuthStore } from '../store/auth.store';

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => userApi.getMe().then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user, login } = useAuthStore();

  return useMutation({
    mutationFn: (data: { name?: string; phone?: string | null }) =>
      userApi.updateMe(data).then((r) => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      // Sync Zustand store so navbar shows updated name immediately
      if (user) {
        login(
          useAuthStore.getState().accessToken ?? '',
          { ...user, name: updated.name },
        );
      }
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      userApi.changePassword(data).then((r) => r.data),
  });
}
