import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useBarber } from '../hooks/useBarbers';
import { useCreateAppointment } from '../hooks/useAppointments';

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

export function BookingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const barberId = params.get('barberId') ?? '';
  const serviceId = params.get('serviceId') ?? '';
  const startAt = params.get('startAt') ?? '';

  const isValidUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const paramsValid = isValidUuid(barberId) && isValidUuid(serviceId) && !!startAt && !isNaN(Date.parse(startAt));

  const { data: barber, isLoading } = useBarber(barberId);
  const createAppointment = useCreateAppointment();
  const [notes, setNotes] = useState('');

  const service = barber?.services.find((s) => s.service.id === serviceId)?.service;

  const endAt = service && startAt
    ? new Date(new Date(startAt).getTime() + service.durationMin * 60_000).toISOString()
    : null;

  const errorMessage = (() => {
    const raw = (createAppointment.error as { response?: { data?: { message?: string } } } | null);
    return raw?.response?.data?.message ?? 'Error al crear la reserva. El slot puede estar ocupado.';
  })();

  const handleConfirm = () => {
    createAppointment.mutate(
      { barberId, serviceId, startAt, notes: notes || undefined },
      { onSuccess: () => navigate('/dashboard/client?booked=1') },
    );
  };

  if (!paramsValid) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-slate-500">Datos de reserva incompletos.</p>
          <Link to="/barbers" className="font-bold text-brand-700 hover:underline">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav className="app-nav flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-bold text-slate-500 hover:text-slate-900"
        >
          ← Volver
        </button>
        <span className="text-slate-300">/</span>
        <span className="font-bold text-slate-700">Confirmar reserva</span>
      </nav>

      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="surface space-y-6 p-6 sm:p-8">
          <div>
            <p className="section-eyebrow">Último paso</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Confirma tu cita</h1>
          </div>

          {isLoading && <p className="text-slate-400">Cargando detalles...</p>}

          {barber && service && (
            <>
              {/* Resumen */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-4">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-lg font-black text-brand-300">
                    {barber.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{barber.user.name}</p>
                    <p className="text-sm text-slate-500">Barbero</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Servicio</p>
                    <p className="font-black text-slate-800">{service.name}</p>
                    <p className="text-sm text-slate-500">{service.durationMin} min</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Precio</p>
                    <p className="text-2xl font-black text-brand-700">${service.price}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-brand-600">Fecha y hora</p>
                  <p className="font-black capitalize text-brand-900">{formatDatetime(startAt)}</p>
                  {endAt && (
                    <p className="text-sm font-medium text-brand-700">
                      Finaliza: {new Date(endAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Notas para el barbero (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Ej: Quiero el mismo corte de siempre, estilo degradado..."
                  className="input-field resize-none"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{notes.length}/300</p>
              </div>

              {createAppointment.isError && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </p>
              )}

              <button
                onClick={handleConfirm}
                disabled={createAppointment.isPending}
                className="btn-primary w-full text-base"
              >
                {createAppointment.isPending ? 'Reservando...' : 'Confirmar reserva'}
              </button>

              <p className="text-center text-xs text-slate-400">
                La cita quedará pendiente de confirmación por el barbero. Podrás cancelarla hasta 2 horas antes.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
