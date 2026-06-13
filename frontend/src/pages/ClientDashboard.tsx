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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-brand-600">BarberBook</Link>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">Hola, {user?.name ?? '...'}</span>
          <Link to="/barbers" className="text-sm text-brand-600 hover:underline font-medium">
            Reservar cita
          </Link>
          <button onClick={() => logout.mutate()} className="text-sm text-red-600 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mis citas</h1>
          <Link
            to="/barbers"
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            + Nueva reserva
          </Link>
        </div>

        {/* Banner reserva exitosa */}
        {justBooked && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <p className="text-green-800 font-medium">¡Reserva creada!</p>
            <p className="text-green-600 text-sm mt-0.5">
              Tu cita está pendiente de confirmación por el barbero.
            </p>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap mb-6">
          {FILTERS.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setActiveFilter(f.value)}
              className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
                activeFilter === f.value
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
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
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!display || display.length === 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-lg font-medium text-gray-600">
              {activeFilter ? 'No hay citas con este filtro' : 'No tienes citas próximas'}
            </p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              Explora nuestros barberos y reserva tu primera cita.
            </p>
            <Link
              to="/barbers"
              className="inline-block bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
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
