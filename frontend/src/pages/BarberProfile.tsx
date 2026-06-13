import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBarber, useAvailability } from '../hooks/useBarbers';
import { useAuthStore } from '../store/auth.store';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function BarberProfile() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuthStore();
  const { data: barber, isLoading, isError } = useBarber(id!);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  const { data: slots, isLoading: loadingSlots } = useAvailability(
    id!,
    selectedDate,
    selectedServiceId || undefined,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Cargando perfil...</div>
      </div>
    );
  }

  if (isError || !barber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">Barbero no encontrado</p>
          <Link to="/barbers" className="text-brand-600 hover:underline">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  const initials = barber.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center gap-4">
        <Link to="/barbers" className="text-gray-400 hover:text-gray-700">← Barberos</Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-700">{barber.user.name}</span>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: perfil */}
        <div className="lg:col-span-1 space-y-6">
          {/* Avatar + nombre */}
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            {barber.user.avatarUrl ? (
              <img src={barber.user.avatarUrl} alt={barber.user.name}
                className="w-24 h-24 rounded-full object-cover mx-auto mb-4" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                {initials}
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">{barber.user.name}</h1>
            {barber.user.phone && <p className="text-sm text-gray-500 mt-1">{barber.user.phone}</p>}
            {barber.bio && <p className="text-sm text-gray-600 mt-3">{barber.bio}</p>}
          </div>

          {/* Horario */}
          {barber.schedules && barber.schedules.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-3">Horario</h2>
              <div className="space-y-2">
                {barber.schedules.filter((s) => s.isActive).map((s) => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{DAY_NAMES[s.dayOfWeek]}</span>
                    <span className="font-medium">{s.startTime} – {s.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Servicios */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-3">Servicios</h2>
            <div className="space-y-3">
              {barber.services.map(({ service }) => (
                <div key={service.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-gray-500">{service.description}</p>
                    )}
                    <p className="text-xs text-gray-400">{service.durationMin} min</p>
                  </div>
                  <span className="text-brand-600 font-bold">${service.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: reserva */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Reservar cita</h2>

            {/* Paso 1: servicio */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. Elige un servicio
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {barber.services.map(({ service }) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`text-left border rounded-xl p-3 transition-colors ${
                      selectedServiceId === service.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-800">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.durationMin} min · ${service.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Paso 2: fecha */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Elige una fecha
              </label>
              <input
                type="date"
                value={selectedDate}
                min={todayStr()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Paso 3: horario disponible */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3. Elige un horario disponible
              </label>

              {loadingSlots && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              )}

              {!loadingSlots && slots?.length === 0 && (
                <p className="text-sm text-gray-400 py-4">
                  No hay horarios disponibles para esta fecha.
                </p>
              )}

              {!loadingSlots && slots && slots.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => {
                    const isClient = accessToken && user?.role === 'CLIENT';
                    const bookingUrl = isClient
                      ? `/booking?barberId=${id}&serviceId=${selectedServiceId}&startAt=${encodeURIComponent(slot.startAt)}`
                      : `/login?redirect=/barbers/${id}`;
                    return (
                      <Link
                        key={slot.startAt}
                        to={bookingUrl}
                        className="text-center border border-brand-200 bg-white text-brand-700 text-sm py-2 rounded-lg hover:bg-brand-50 hover:border-brand-400 transition-colors"
                      >
                        {slot.startTime}
                      </Link>
                    );
                  })}
                </div>
              )}

              {!selectedServiceId && (
                <p className="text-xs text-gray-400 mt-2">Selecciona un servicio para ver los horarios</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
