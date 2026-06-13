import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBarber, useAvailability } from '../hooks/useBarbers';
import { useAuthStore } from '../store/auth.store';
import { AppNavbar } from '../components/AppNavbar';
import type { Schedule } from '../api/barber.api';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Usa la fecha LOCAL del usuario, no UTC
function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Devuelve el primer día con horario disponible a partir de hoy
function nextAvailableDate(schedules: Schedule[]): string {
  const activeDays = new Set(schedules.filter((s) => s.isActive).map((s) => s.dayOfWeek));
  if (activeDays.size === 0) return localDateStr();

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    if (!activeDays.has(dow)) continue;

    if (i === 0) {
      // Hoy: verificar que quede al menos un slot de 30 min antes del cierre
      const sched = schedules.find((s) => s.dayOfWeek === dow && s.isActive);
      if (sched) {
        const [eh, em] = sched.endTime.split(':').map(Number);
        const lastSlotStart = eh * 60 + em - 30;
        if (currentMinutes >= lastSlotStart) continue; // ya cerró
      }
    }
    return localDateStr(d);
  }
  return localDateStr();
}

export function BarberProfile() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, user } = useAuthStore();
  const { data: barber, isLoading, isError } = useBarber(id!);

  const [selectedDate, setSelectedDate] = useState(localDateStr());
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Cuando carga el horario del barbero, saltar al primer día disponible
  useEffect(() => {
    if (barber?.schedules && barber.schedules.length > 0) {
      setSelectedDate(nextAvailableDate(barber.schedules));
    }
  }, [barber?.schedules]);

  const { data: slots, isLoading: loadingSlots } = useAvailability(
    id!,
    selectedDate,
    selectedServiceId || undefined,
  );

  if (isLoading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="panel px-6 py-4 text-lg font-semibold text-slate-500">Cargando perfil...</div>
      </div>
    );
  }

  if (isError || !barber) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-lg font-semibold text-red-600">Barbero no encontrado</p>
          <Link to="/barbers" className="font-bold text-brand-700 hover:underline">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  const initials = barber.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-shell">
      <AppNavbar back={{ label: 'Barberos', to: '/barbers' }} />

      <main className="page-container grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <div className="surface p-6 text-center">
            {barber.user.avatarUrl ? (
              <img src={barber.user.avatarUrl} alt={barber.user.name}
                className="mx-auto mb-4 h-28 w-28 rounded-lg object-cover ring-4 ring-brand-100" />
            ) : (
              <div className="mx-auto mb-4 grid h-28 w-28 place-items-center rounded-lg bg-slate-950 text-3xl font-black text-brand-300 shadow-lg shadow-slate-950/15">
                {initials}
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-950">{barber.user.name}</h1>
            {barber.user.phone && <p className="mt-1 text-sm text-slate-500">{barber.user.phone}</p>}
            {barber.bio && <p className="mt-3 text-sm leading-6 text-slate-600">{barber.bio}</p>}
          </div>

          {barber.schedules && barber.schedules.length > 0 && (
            <div className="panel p-6">
              <h2 className="mb-3 font-black text-slate-900">Horario</h2>
              <div className="space-y-2">
                {barber.schedules.filter((s) => s.isActive).map((s) => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{DAY_NAMES[s.dayOfWeek]}</span>
                    <span className="font-bold text-slate-900">{s.startTime} – {s.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel p-6">
            <h2 className="mb-3 font-black text-slate-900">Servicios</h2>
            <div className="space-y-3">
              {barber.services.map(({ service }) => (
                <div key={service.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-slate-500">{service.description}</p>
                    )}
                    <p className="text-xs text-slate-400">{service.durationMin} min</p>
                  </div>
                  <span className="font-black text-brand-700">${service.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="surface p-6 md:p-8">
            <p className="section-eyebrow">Reserva online</p>
            <h2 className="mb-6 mt-2 text-3xl font-black text-slate-950">Elige tu hora</h2>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                1. Elige un servicio
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {barber.services.map(({ service }) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedServiceId === service.id
                        ? 'border-brand-500 bg-brand-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-black text-slate-800">{service.name}</p>
                    <p className="text-xs text-slate-500">{service.durationMin} min · ${service.price}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                2. Elige una fecha
              </label>
              <input
                type="date"
                value={selectedDate}
                min={localDateStr()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field max-w-xs"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
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
                <p className="py-4 text-sm text-slate-400">
                  No hay horarios disponibles para esta fecha.
                </p>
              )}

              {!loadingSlots && slots && slots.length > 0 && (
                <>
                  {/* Aviso para usuarios autenticados que no son cliente */}
                  {accessToken && user?.role !== 'CLIENT' && (
                    <p className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-medium text-amber-800">
                      Las reservas son solo para clientes. Tu cuenta es de tipo {user?.role.toLowerCase()}.
                    </p>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot) => {
                      const isClient = accessToken && user?.role === 'CLIENT';
                      const notLoggedIn = !accessToken;
                      if (isClient || notLoggedIn) {
                        const to = isClient
                          ? `/booking?barberId=${id}&serviceId=${selectedServiceId}&startAt=${encodeURIComponent(slot.startAt)}`
                          : `/login?redirect=/barbers/${id}`;
                        return (
                          <Link
                            key={slot.startAt}
                            to={to}
                            className="rounded-lg border border-brand-200 bg-white py-2 text-center text-sm font-bold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50"
                          >
                            {slot.startTime}
                          </Link>
                        );
                      }
                      return (
                        <span
                          key={slot.startAt}
                          className="rounded-lg border border-slate-200 bg-slate-50 py-2 text-center text-sm font-bold text-slate-400 cursor-not-allowed"
                          title="Solo clientes pueden reservar"
                        >
                          {slot.startTime}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}

              {!selectedServiceId && (
                <p className="mt-2 text-xs text-slate-400">Selecciona un servicio para ver los horarios</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
