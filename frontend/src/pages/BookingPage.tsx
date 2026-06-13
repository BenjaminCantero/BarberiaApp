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

  const { data: barber, isLoading } = useBarber(barberId);
  const createAppointment = useCreateAppointment();
  const [notes, setNotes] = useState('');

  const service = barber?.services.find((s) => s.service.id === serviceId)?.service;

  const endAt = service && startAt
    ? new Date(new Date(startAt).getTime() + service.durationMin * 60_000).toISOString()
    : null;

  const handleConfirm = () => {
    createAppointment.mutate(
      { barberId, serviceId, startAt, notes: notes || undefined },
      { onSuccess: () => navigate('/dashboard/client?booked=1') },
    );
  };

  if (!barberId || !serviceId || !startAt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Datos de reserva incompletos.</p>
          <Link to="/barbers" className="text-brand-600 hover:underline">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-700 text-sm"
        >
          ← Volver
        </button>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-700">Confirmar reserva</span>
      </nav>

      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Confirma tu cita</h1>

          {isLoading && <p className="text-gray-400">Cargando detalles...</p>}

          {barber && service && (
            <>
              {/* Resumen */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">
                    {barber.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{barber.user.name}</p>
                    <p className="text-sm text-gray-500">Barbero</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Servicio</p>
                    <p className="font-semibold text-gray-800">{service.name}</p>
                    <p className="text-sm text-gray-500">{service.durationMin} min</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Precio</p>
                    <p className="text-2xl font-bold text-brand-600">${service.price}</p>
                  </div>
                </div>

                <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl">
                  <p className="text-xs text-brand-500 mb-1">Fecha y hora</p>
                  <p className="font-semibold text-brand-800 capitalize">{formatDatetime(startAt)}</p>
                  {endAt && (
                    <p className="text-sm text-brand-600">
                      Finaliza: {new Date(endAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas para el barbero (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Ej: Quiero el mismo corte de siempre, estilo degradado..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{notes.length}/300</p>
              </div>

              {createAppointment.isError && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                  {(createAppointment.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear la reserva. Inténtalo de nuevo.'}
                </p>
              )}

              <button
                onClick={handleConfirm}
                disabled={createAppointment.isPending}
                className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {createAppointment.isPending ? 'Reservando...' : 'Confirmar reserva'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                La cita quedará pendiente de confirmación por el barbero. Podrás cancelarla hasta 2 horas antes.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
