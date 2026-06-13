import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useLogout } from '../hooks/useAuth';

interface Props {
  dark?: boolean;
  back?: { label: string; to: string };
}

export function AppNavbar({ dark, back }: Props) {
  const { accessToken, user } = useAuthStore();
  const logout = useLogout();

  const dashboardPath =
    user?.role === 'BARBER' ? '/dashboard/barber' :
    user?.role === 'ADMIN'  ? '/dashboard/admin' :
    '/dashboard/client';

  const textMuted = dark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900';
  const textDanger = dark ? 'text-slate-400 hover:text-white' : 'text-red-600 hover:text-red-700';

  return (
    <nav className={`app-nav${dark ? ' app-nav-dark' : ''} flex flex-wrap items-center justify-between gap-3`}>
      {back ? (
        <Link to={back.to} className={`text-sm font-bold ${textMuted}`}>
          ← {back.label}
        </Link>
      ) : (
        <Link to="/" className={`brand-mark${dark ? ' text-white' : ''}`}>
          <span className="brand-icon">BB</span>
          <span>BarberBook</span>
        </Link>
      )}

      <div className="flex items-center gap-2 sm:gap-3">
        <Link to="/barbers" className={`hidden text-sm font-semibold sm:inline ${textMuted}`}>
          Barberos
        </Link>

        {!accessToken ? (
          <>
            <Link
              to="/login"
              className={dark
                ? 'btn-secondary min-h-10 border-white/20 bg-white/10 px-4 text-white hover:bg-white/20'
                : 'btn-secondary min-h-10 px-4'}
            >
              Entrar
            </Link>
            <Link to="/register" className="btn-brand min-h-10 px-4">Reservar</Link>
          </>
        ) : (
          <>
            <Link to={dashboardPath} className={`text-sm font-bold ${textMuted}`}>
              {user?.name?.split(' ')[0] ?? 'Mi cuenta'}
            </Link>
            <button
              onClick={() => logout.mutate()}
              className={`text-sm font-bold ${textDanger}`}
            >
              Salir
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
