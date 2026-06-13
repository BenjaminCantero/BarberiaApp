import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCurrentUser, useLogout } from '../hooks/useAuth';
import { useMyAppointments } from '../hooks/useAppointments';
import { AppointmentCard } from '../components/AppointmentCard';
import type { AppointmentStatus } from '../api/appointment.api';

const FILTERS: { label: string; value: AppointmentStatus | undefined }[] = [
  { label: 'Próximas', value: undefined },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Confirmadas', value: 'CONFIRMED' },
  { label: 'Completadas', value: 'COMPLETED' },
  { label: 'Canceladas', value: 'CANCELLED' },
];

export function ClientDashboard() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const [searchParams] = useSearchParams();
  const justBooked = searchParams.get('booked') === '1';

  const [activeFilter, setActiveFilter] = useState<AppointmentStatus | undefined>(undefined);
  const { data: appointments, isLoading } = useMyAppointments(
    activeFilter ? { status: activeFilter } : undefined,
  );

  const upcoming = appointments?.filter(
    (a) => new Date(a.startAt) > new Date() && a.status !== 'CANCELLED',
  );
  const display = activeFilter ? appointments : upcoming;

  return (
    <div className="app-shell">
      <nav className="app-nav flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="brand-mark">
          <span className="brand-icon">BB</span>
          <span>BarberBook</span>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Hola, {user?.name ?? '...'}</span>
          <Link to="/barbers" className="text-sm font-bold text-brand-700 hover:underline">
            Reservar cita
          </Link>
          <Link to="/profile" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Mi perfil
          </Link>
          <button onClick={() => logout.mutate()} className="text-sm font-bold text-red-600 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-950 p-6 text-white">
          <div>
            <p className="section-eyebrow text-brand-300">Panel cliente</p>
            <h1 className="mt-2 text-3xl font-black">Mis citas</h1>
          </div>
          <Link
            to="/barbers"
            className="btn-brand"
          >
            + Nueva reserva
          </Link>
        </div>

        {/* Banner reserva exitosa */}
        {justBooked && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="font-black text-emerald-800">¡Reserva creada!</p>
            <p className="mt-0.5 text-sm text-emerald-700">
              Tu cita está pendiente de confirmación por el barbero.
            </p>
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setActiveFilter(f.value)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                activeFilter === f.value
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="panel animate-pulse space-y-3 p-5">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!display || display.length === 0) && (
          <div className="panel p-10 text-center">
            <p className="text-lg font-black text-slate-700">
              {activeFilter ? 'No hay citas con este filtro' : 'No tienes citas próximas'}
            </p>
            <p className="mb-5 mt-1 text-sm text-slate-400">
              Explora nuestros barberos y reserva tu primera cita.
            </p>
            <Link
              to="/barbers"
              className="btn-brand"
            >
              Ver barberos
            </Link>
          </div>
        )}

        {!isLoading && display && display.length > 0 && (
          <div className="space-y-4">
            {display.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} viewAs="CLIENT" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
