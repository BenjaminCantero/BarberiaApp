import type { Appointment } from '../api/appointment.api';
import { StatusBadge } from './StatusBadge';
import { useUpdateAppointmentStatus } from '../hooks/useAppointments';

interface Props {
  appointment: Appointment;
  viewAs: 'CLIENT' | 'BARBER' | 'ADMIN';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export function AppointmentCard({ appointment, viewAs }: Props) {
  const update = useUpdateAppointmentStatus();
  const { id, status, startAt, endAt, service, client, barber, notes } = appointment;

  const isPast = new Date(startAt) < new Date();
  const hoursUntil = (new Date(startAt).getTime() - Date.now()) / 3_600_000;
  const canClientCancel = status === 'PENDING' || (status === 'CONFIRMED' && hoursUntil >= 2);

  const handleStatus = (newStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    update.mutate({ id, status: newStatus });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-gray-900">{service.name}</p>
          <p className="text-sm text-gray-500">{formatDate(startAt)} – {new Date(endAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Detalles según quién ve */}
      <div className="text-sm text-gray-600 space-y-1">
        {viewAs === 'CLIENT' && (
          <p>Barbero: <span className="font-medium text-gray-800">{barber.user.name}</span></p>
        )}
        {viewAs !== 'CLIENT' && (
          <p>Cliente: <span className="font-medium text-gray-800">{client.name}</span>
            {client.phone && <span className="text-gray-400"> · {client.phone}</span>}
          </p>
        )}
        <p>Servicio: <span className="font-medium">{service.durationMin} min · <span className="text-brand-600">${service.price}</span></span></p>
        {notes && <p className="italic text-gray-400">"{notes}"</p>}
      </div>

      {/* Acciones */}
      {!isPast && status !== 'CANCELLED' && status !== 'COMPLETED' && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
          {viewAs !== 'CLIENT' && status === 'PENDING' && (
            <button
              onClick={() => handleStatus('CONFIRMED')}
              disabled={update.isPending}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Confirmar
            </button>
          )}
          {viewAs !== 'CLIENT' && status === 'CONFIRMED' && (
            <button
              onClick={() => handleStatus('COMPLETED')}
              disabled={update.isPending}
              className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Marcar completada
            </button>
          )}
          {(viewAs !== 'CLIENT' || canClientCancel) && (
            <button
              onClick={() => handleStatus('CANCELLED')}
              disabled={update.isPending}
              className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
