import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

interface Props {
  allowedRoles?: Array<'CLIENT' | 'BARBER' | 'ADMIN'>;
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard/client" replace />;
  }

  return <Outlet />;
}
