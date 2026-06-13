import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

/**
 * Al montar la app intenta restaurar la sesión usando el refresh token
 * de la cookie httpOnly. Si tiene éxito, hidrata el store con el token
 * y los datos del usuario antes de renderizar las rutas protegidas.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { accessToken, login } = useAuthStore();

  useEffect(() => {
    if (accessToken) {
      setReady(true);
      return;
    }

    const restore = async () => {
      try {
        const { data: refreshData } = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true },
        );
        const { data: userData } = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${refreshData.accessToken}` },
        });
        login(refreshData.accessToken, userData);
      } catch {
        // Sin cookie válida: el usuario tendrá que iniciar sesión
      } finally {
        setReady(true);
      }
    };

    restore();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
          <span className="text-sm font-medium">Cargando...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
