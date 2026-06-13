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
    <div className="panel flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-black text-slate-950">{service.name}</p>
          <p className="text-sm font-medium text-slate-500">{formatDate(startAt)} – {new Date(endAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-1 text-sm text-slate-600">
        {viewAs === 'CLIENT' && (
          <p>Barbero: <span className="font-bold text-slate-800">{barber.user.name}</span></p>
        )}
        {viewAs !== 'CLIENT' && (
          <p>Cliente: <span className="font-bold text-slate-800">{client.name}</span>
            {client.phone && <span className="text-slate-400"> · {client.phone}</span>}
          </p>
        )}
        <p>Servicio: <span className="font-bold">{service.durationMin} min · <span className="text-brand-700">${service.price}</span></span></p>
        {notes && <p className="italic text-slate-400">"{notes}"</p>}
      </div>

      {!isPast && status !== 'CANCELLED' && status !== 'COMPLETED' && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {viewAs !== 'CLIENT' && status === 'PENDING' && (
            <button
              onClick={() => handleStatus('CONFIRMED')}
              disabled={update.isPending}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              Confirmar
            </button>
          )}
          {viewAs !== 'CLIENT' && status === 'CONFIRMED' && (
            <button
              onClick={() => handleStatus('COMPLETED')}
              disabled={update.isPending}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-900 disabled:opacity-50"
            >
              Marcar completada
            </button>
          )}
          {(viewAs !== 'CLIENT' || canClientCancel) && (
            <button
              onClick={() => handleStatus('CANCELLED')}
              disabled={update.isPending}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
