import { useMemo, useState } from 'react';
import type { Appointment } from '../api/appointment.api';
import type { Schedule, ScheduleBlock } from '../api/barber.api';
import { useMyAppointments } from '../hooks/useAppointments';
import { useScheduleBlocks } from '../hooks/useBarbers';
import { AppointmentCard } from './AppointmentCard';
import { StatusBadge } from './StatusBadge';
import { describeBlock } from './ScheduleBlocks';
import {
  DAY_SHORT, addDays, dayOfWeek, formatLongDate, formatRanges, formatShortDate,
  rangesByDay, shopDate, shopTime, startOfWeek, zonedDayBounds,
} from '../lib/agenda';

interface Props {
  barberId: string;
  schedule?: Schedule[];
}

type View = 'day' | 'week';

function blocksOn(date: string, blocks: ScheduleBlock[] = []): ScheduleBlock[] {
  const { start, end } = zonedDayBounds(date);
  return blocks.filter((b) => new Date(b.startAt) < end && new Date(b.endAt) > start);
}

export function BarberAgenda({ barberId, schedule }: Props) {
  const today = shopDate();
  const [view, setView] = useState<View>('day');
  const [date, setDate] = useState(today);
  const [showCancelled, setShowCancelled] = useState(false);

  const from = view === 'day' ? date : startOfWeek(date);
  const to = view === 'day' ? date : addDays(from, 6);

  const { data: appointments, isLoading, isError } = useMyAppointments({ from, to });
  const { data: blocks } = useScheduleBlocks(barberId, { from, to });
  const byDay = useMemo(() => rangesByDay(schedule), [schedule]);

  const visible = (appointments ?? []).filter((a) => showCancelled || a.status !== 'CANCELLED');
  const cancelledCount = (appointments ?? []).length - (appointments ?? []).filter((a) => a.status !== 'CANCELLED').length;

  const step = view === 'day' ? 1 : 7;
  const isCurrent = view === 'day' ? date === today : from === startOfWeek(today);

  const title = view === 'day'
    ? formatLongDate(date)
    : `${formatShortDate(from)} – ${formatShortDate(to)}`;

  const openDay = (d: string) => { setDate(d); setView('day'); };

  return (
    <div className="space-y-5">
      {/* Navegación */}
      <div className="panel agenda-toolbar p-3">
        <div className="flex items-center gap-1">
          <button className="btn-secondary btn-sm agenda-nav" onClick={() => setDate(addDays(date, -step))}
            aria-label={view === 'day' ? 'Día anterior' : 'Semana anterior'}>‹</button>
          <button className="btn-secondary btn-sm" onClick={() => setDate(today)} disabled={isCurrent}>Hoy</button>
          <button className="btn-secondary btn-sm agenda-nav" onClick={() => setDate(addDays(date, step))}
            aria-label={view === 'day' ? 'Día siguiente' : 'Semana siguiente'}>›</button>
        </div>
        <p className="agenda-title" aria-live="polite">{title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
            className="input-field agenda-date" aria-label="Ir a fecha" />
          <div className="seg" role="radiogroup" aria-label="Vista">
            <button role="radio" aria-checked={view === 'day'} className={view === 'day' ? 'is-active' : ''} onClick={() => setView('day')}>Día</button>
            <button role="radio" aria-checked={view === 'week'} className={view === 'week' ? 'is-active' : ''} onClick={() => setView('week')}>Semana</button>
          </div>
        </div>
      </div>

      {cancelledCount > 0 && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="h-4 w-4" />
          Mostrar canceladas ({cancelledCount})
        </label>
      )}

      {isError && (
        <p role="alert" className="panel p-5 text-sm text-red-600">No se pudo cargar la agenda. Reintenta en unos segundos.</p>
      )}

      {view === 'day' && (
        <DayView
          date={date}
          ranges={byDay.get(dayOfWeek(date))}
          blocks={blocksOn(date, blocks)}
          appointments={visible}
          loading={isLoading}
        />
      )}

      {view === 'week' && (
        <div className="agenda-week">
          {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => {
            const dayAppts = visible.filter((a) => shopDate(a.startAt) === d);
            const ranges = byDay.get(dayOfWeek(d));
            const dayBlocks = blocksOn(d, blocks);
            return (
              <button key={d} onClick={() => openDay(d)}
                className={`agenda-week-day${d === today ? ' is-today' : ''}${!ranges ? ' is-off' : ''}`}
                aria-label={`${formatLongDate(d)}: ${dayAppts.length} cita${dayAppts.length === 1 ? '' : 's'}. Ver día`}>
                <span className="agenda-week-head">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{DAY_SHORT[dayOfWeek(d)]}</span>
                  <span className="agenda-week-num">{Number(d.slice(8))}</span>
                </span>
                <span className="text-xs text-slate-400">{ranges ? formatRanges(ranges) : 'Libre'}</span>
                {dayBlocks.length > 0 && <span className="chip agenda-block-chip">Bloqueado</span>}
                {isLoading ? (
                  <span className="text-xs text-slate-400">…</span>
                ) : dayAppts.length === 0 ? (
                  <span className="text-xs text-slate-400">Sin citas</span>
                ) : (
                  <span className="agenda-week-list">
                    {dayAppts.slice(0, 4).map((a) => (
                      <span key={a.id} className={`agenda-week-item${a.status === 'CANCELLED' ? ' is-cancelled' : ''}`}>
                        <b>{shopTime(a.startAt)}</b> {a.client.name.split(' ')[0]}
                      </span>
                    ))}
                    {dayAppts.length > 4 && <span className="text-xs text-slate-400">+{dayAppts.length - 4} más</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DayView({ date, ranges, blocks, appointments, loading }: {
  date: string;
  ranges?: { startTime: string; endTime: string }[];
  blocks: ScheduleBlock[];
  appointments: Appointment[];
  loading: boolean;
}) {
  const pending = appointments.filter((a) => a.status === 'PENDING').length;
  const active = appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="chip">{ranges ? `Turno: ${formatRanges(ranges)}` : 'No trabajas este día'}</span>
        {!loading && <span className="chip">{active} cita{active === 1 ? '' : 's'} activa{active === 1 ? '' : 's'}</span>}
        {pending > 0 && <StatusBadge status="PENDING" />}
      </div>

      {blocks.map((b) => (
        <div key={b.id} className="panel agenda-block p-4 text-sm">
          <p className="font-bold text-slate-900">Bloqueado · {describeBlock(b)}</p>
          {b.reason && <p className="text-slate-500">{b.reason}</p>}
        </div>
      ))}

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="panel h-28 animate-pulse p-5" />)}
        </div>
      )}

      {!loading && appointments.length === 0 && (
        <div className="panel p-10 text-center">
          <p className="font-bold text-slate-600">Sin citas el {formatLongDate(date)}</p>
        </div>
      )}

      {!loading && appointments.length > 0 && (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} viewAs="BARBER" />
          ))}
        </div>
      )}
    </div>
  );
}
