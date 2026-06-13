import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginPayload, type RegisterPayload } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export function useLogin(redirectTo?: string) {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginPayload) => authApi.login(data),
    onSuccess: ({ data }) => {
      const userData = data.user as Parameters<typeof login>[1];
      login(data.accessToken, userData);
      if (redirectTo) {
        navigate(redirectTo);
        return;
      }
      const destination =
        userData.role === 'BARBER' ? '/dashboard/barber' :
        userData.role === 'ADMIN'  ? '/dashboard/admin' :
        '/dashboard/client';
      navigate(destination);
    },
  });
}

export function useRegister(redirectTo?: string) {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
    onSuccess: () => {
      const target = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login';
      navigate(target);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then((r) => r.data),
    enabled: isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}
