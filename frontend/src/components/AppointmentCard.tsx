import { useState } from 'react';
import type { Appointment } from '../api/appointment.api';
import { StatusBadge } from './StatusBadge';
import { ConfirmDialog } from './ConfirmDialog';
import { useUpdateAppointmentStatus, useRescheduleAppointment } from '../hooks/useAppointments';
import { useCreateReview } from '../hooks/useReviews';
import { StarRatingInput, StarRatingDisplay } from './StarRating';
import { formatPrice } from '../lib/format';
import { SHOP_TIMEZONE, shopDate, shopTime, shopWallTimeToIso } from '../lib/agenda';

interface Props {
  appointment: Appointment;
  viewAs: 'CLIENT' | 'BARBER' | 'ADMIN';
}

// Fechas y horas siempre en la zona de la barbería, no la del navegador.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: SHOP_TIMEZONE,
  });
}

// Valor para <input type="datetime-local"> en hora de la barbería.
function toShopInput(iso: string): string {
  return `${shopDate(iso)}T${shopTime(iso)}`;
}

export function AppointmentCard({ appointment, viewAs }: Props) {
  const update = useUpdateAppointmentStatus();
  const reschedule = useRescheduleAppointment();
  const createReview = useCreateReview();
  const { id, status, startAt, endAt, service, client, barber, notes, review } = appointment;

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [newStart, setNewStart] = useState(() => toShopInput(startAt));
  const [reviewing, setReviewing] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmitReview = () => {
    createReview.mutate(
      { appointmentId: id, rating, comment: comment.trim() || undefined },
      { onSuccess: () => setReviewing(false) },
    );
  };

  const isPast = new Date(startAt) < new Date();
  const hoursUntil = (new Date(startAt).getTime() - Date.now()) / 3_600_000;
  const canClientCancel = status === 'PENDING' || (status === 'CONFIRMED' && hoursUntil >= 2);
  const canReschedule =
    (status === 'PENDING' || status === 'CONFIRMED') &&
    !isPast &&
    (viewAs !== 'CLIENT' || hoursUntil >= 2);

  const handleStatus = (newStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    update.mutate({ id, status: newStatus });
  };

  const handleReschedule = () => {
    reschedule.mutate(
      { id, startAt: shopWallTimeToIso(newStart.slice(0, 10), newStart.slice(11, 16)) },
      { onSuccess: () => setRescheduling(false) },
    );
  };

  return (
    <div className="panel flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-black text-slate-950">{service.name}</p>
          <p className="text-sm font-medium text-slate-500">{formatDate(startAt)} – {shopTime(endAt)}</p>
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
        <p>Servicio: <span className="font-bold">{service.durationMin} min · <span className="text-brand-700">{formatPrice(service.price)}</span></span></p>
        {notes && <p className="italic text-slate-400">"{notes}"</p>}
      </div>

      {/* Panel de reprogramación */}
      {rescheduling && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="flex flex-col text-xs font-bold text-slate-500">
            Nuevo horario
            <input
              type="datetime-local"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800"
            />
          </label>
          <button
            onClick={handleReschedule}
            disabled={reschedule.isPending}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            onClick={() => setRescheduling(false)}
            disabled={reschedule.isPending}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
      )}

      {status !== 'CANCELLED' && status !== 'COMPLETED' && (viewAs !== 'CLIENT' || !isPast) && (
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
          {canReschedule && !rescheduling && (
            <button
              onClick={() => { setNewStart(toShopInput(startAt)); setRescheduling(true); }}
              disabled={update.isPending || reschedule.isPending}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Reprogramar
            </button>
          )}
          {(viewAs !== 'CLIENT' || canClientCancel) && (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={update.isPending}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Reseña: solo el cliente, en citas completadas */}
      {viewAs === 'CLIENT' && status === 'COMPLETED' && (
        <div className="border-t border-slate-100 pt-3">
          {review ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Tu reseña:</span>
              <StarRatingDisplay value={review.rating} />
            </div>
          ) : reviewing ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="mb-1 text-xs font-bold text-slate-500">¿Cómo estuvo tu experiencia?</p>
                <StarRatingInput value={rating} onChange={setRating} />
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Contanos cómo fue (opcional)"
                rows={2}
                maxLength={1000}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitReview}
                  disabled={createReview.isPending}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
                >
                  Enviar reseña
                </button>
                <button
                  onClick={() => setReviewing(false)}
                  disabled={createReview.isPending}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setReviewing(true)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
            >
              ★ Dejar reseña
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar cita"
        message="¿Seguro que querés cancelar esta cita? Esta acción no se puede deshacer."
        confirmLabel="Sí, cancelar"
        cancelLabel="Volver"
        variant="danger"
        loading={update.isPending}
        onConfirm={() => { handleStatus('CANCELLED'); setConfirmCancel(false); }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
