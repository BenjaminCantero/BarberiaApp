import { useState } from 'react';
import type { ScheduleBlock } from '../api/barber.api';
import { useCreateBlock, useDeleteBlock, useScheduleBlocks } from '../hooks/useBarbers';
import { ConfirmDialog } from './ConfirmDialog';
import { addDays, formatShortDate, shopDate, shopTime } from '../lib/agenda';

/** "24 dic – 31 dic", "24 dic (día completo)" o "24 dic · 10:00–12:00". */
export function describeBlock(block: Pick<ScheduleBlock, 'startAt' | 'endAt'>): string {
  const startDay = shopDate(block.startAt);
  const endDay = shopDate(block.endAt);
  const fullDays = shopTime(block.startAt) === '00:00' && shopTime(block.endAt) === '00:00';
  if (fullDays) {
    const lastDay = addDays(endDay, -1);
    return lastDay === startDay
      ? `${formatShortDate(startDay)} (día completo)`
      : `${formatShortDate(startDay)} – ${formatShortDate(lastDay)}`;
  }
  if (startDay === endDay) return `${formatShortDate(startDay)} · ${shopTime(block.startAt)}–${shopTime(block.endAt)}`;
  return `${formatShortDate(startDay)} ${shopTime(block.startAt)} – ${formatShortDate(endDay)} ${shopTime(block.endAt)}`;
}

export function ScheduleBlocks({ barberId }: { barberId: string }) {
  const { data: blocks, isLoading } = useScheduleBlocks(barberId);
  const create = useCreateBlock(barberId);
  const remove = useDeleteBlock(barberId);

  const today = shopDate();
  const [mode, setMode] = useState<'days' | 'hours'>('days');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ScheduleBlock | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'days' && endDate < startDate) { setError('La fecha final debe ser igual o posterior a la inicial.'); return; }
    if (mode === 'hours' && startTime >= endTime) { setError('La hora de inicio debe ser anterior a la de fin.'); return; }
    create.mutate(
      mode === 'days'
        ? { startDate, endDate, reason: reason.trim() || undefined }
        : { startDate, startTime, endTime, reason: reason.trim() || undefined },
      { onSuccess: () => setReason('') },
    );
  };

  return (
    <section className="panel space-y-5 p-6" aria-labelledby="blocks-title">
      <div>
        <h2 id="blocks-title" className="font-black text-slate-900">Días libres y bloqueos</h2>
        <p className="text-xs text-slate-400">Vacaciones, feriados o unas horas sueltas. Durante un bloqueo nadie puede reservar contigo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="seg max-w-sm" role="radiogroup" aria-label="Tipo de bloqueo">
          <button type="button" role="radio" aria-checked={mode === 'days'} className={mode === 'days' ? 'is-active' : ''} onClick={() => setMode('days')}>
            Días completos
          </button>
          <button type="button" role="radio" aria-checked={mode === 'hours'} className={mode === 'hours' ? 'is-active' : ''} onClick={() => setMode('hours')}>
            Unas horas
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1">
            <span className="field-label">{mode === 'days' ? 'Desde' : 'Día'}</span>
            <input type="date" required min={today} value={startDate}
              onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }}
              className="input-field" />
          </label>
          {mode === 'days' ? (
            <label className="flex flex-col gap-1">
              <span className="field-label">Hasta (incluido)</span>
              <input type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className="field-label">De</span>
                <input type="time" required step={1800} value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field input-time" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="field-label">A</span>
                <input type="time" required step={1800} value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field input-time" />
              </label>
            </>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="field-label">Motivo (opcional, solo lo ves tú)</span>
          <input className="input-field" maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Vacaciones, trámite, curso..." />
        </label>

        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Guardando...' : 'Bloquear'}
        </button>
      </form>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Próximos bloqueos</h3>
        {isLoading && <p className="text-sm text-slate-400">Cargando...</p>}
        {!isLoading && !blocks?.length && <p className="text-sm text-slate-400">No tienes bloqueos programados.</p>}
        {!!blocks?.length && (
          <ul className="divide-y divide-slate-100">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{describeBlock(b)}</p>
                  {b.reason && <p className="truncate text-xs text-slate-500">{b.reason}</p>}
                </div>
                <button onClick={() => setToDelete(b)} className="link-danger shrink-0 text-xs font-bold">
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar bloqueo"
        message={toDelete ? `Se volverá a poder reservar en ${describeBlock(toDelete)}.` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
