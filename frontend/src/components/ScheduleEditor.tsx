import { useState } from 'react';
import type { Schedule, ScheduleEntry } from '../api/barber.api';
import { useSetSchedule } from '../hooks/useBarbers';
import { DAY_NAMES, WEEK_ORDER, formatRanges, rangesByDay, toMinutes, type Range } from '../lib/agenda';

interface Props {
  barberId: string;
  schedule?: Schedule[];
  loading?: boolean;
}

type Draft = Record<number, Range[]>;

const DEFAULT_RANGE: Range = { startTime: '09:00', endTime: '18:00' };

function toDraft(schedule: Schedule[] = []): Draft {
  const byDay = rangesByDay(schedule);
  const draft: Draft = {};
  for (let d = 0; d <= 6; d++) draft[d] = byDay.get(d) ?? [];
  return draft;
}

function pad(min: number): string {
  const m = Math.min(Math.max(min, 0), 23 * 60 + 59);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Mismas reglas que el backend, para avisar antes de enviar. */
function validate(draft: Draft): string | null {
  for (const d of WEEK_ORDER) {
    const sorted = [...draft[d]].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      if (!r.startTime || !r.endTime) return `${DAY_NAMES[d]}: completa las horas de cada tramo.`;
      if (toMinutes(r.startTime) >= toMinutes(r.endTime)) {
        return `${DAY_NAMES[d]}: el tramo ${r.startTime}–${r.endTime} termina antes de empezar.`;
      }
      const prev = sorted[i - 1];
      if (prev && toMinutes(r.startTime) < toMinutes(prev.endTime)) {
        return `${DAY_NAMES[d]}: los tramos ${prev.startTime}–${prev.endTime} y ${r.startTime}–${r.endTime} se pisan.`;
      }
    }
  }
  return null;
}

export function ScheduleEditor({ barberId, schedule, loading }: Props) {
  const save = useSetSchedule(barberId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(schedule));
  const [error, setError] = useState<string | null>(null);

  const byDay = rangesByDay(schedule);

  const open = () => {
    const initial = toDraft(schedule);
    // Sin horario aún: propone lunes a viernes 09-18 como punto de partida.
    if (!schedule?.length) [1, 2, 3, 4, 5].forEach((d) => { initial[d] = [{ ...DEFAULT_RANGE }]; });
    setDraft(initial);
    setError(null);
    setEditing(true);
  };

  const setDay = (day: number, ranges: Range[]) => {
    setDraft((prev) => ({ ...prev, [day]: ranges }));
    setError(null);
  };

  const toggleDay = (day: number) => setDay(day, draft[day].length ? [] : [{ ...DEFAULT_RANGE }]);

  const updateRange = (day: number, idx: number, field: keyof Range, value: string) =>
    setDay(day, draft[day].map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const addRange = (day: number) => {
    const last = draft[day][draft[day].length - 1];
    const start = last ? toMinutes(last.endTime) + 60 : 9 * 60;
    setDay(day, [...draft[day], { startTime: pad(start), endTime: pad(start + 180) }]);
  };

  const removeRange = (day: number, idx: number) => setDay(day, draft[day].filter((_, i) => i !== idx));

  const copyToWorkingDays = (from: number) => {
    const source = draft[from];
    setDraft((prev) => {
      const next = { ...prev };
      for (const d of WEEK_ORDER) if (d !== from && prev[d].length) next[d] = source.map((r) => ({ ...r }));
      return next;
    });
  };

  const handleSave = () => {
    const err = validate(draft);
    if (err) { setError(err); return; }
    const entries: ScheduleEntry[] = WEEK_ORDER.flatMap((d) =>
      draft[d].map((r) => ({ dayOfWeek: d, startTime: r.startTime, endTime: r.endTime, isActive: true })),
    );
    save.mutate(entries, { onSuccess: () => setEditing(false) });
  };

  const noDays = WEEK_ORDER.every((d) => draft[d].length === 0);

  return (
    <section className="panel space-y-4 p-6" aria-labelledby="schedule-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="schedule-title" className="font-black text-slate-900">Horario semanal</h2>
          <p className="text-xs text-slate-400">Añade varios tramos en un día para dejar una pausa (por ejemplo, el almuerzo).</p>
        </div>
        {!editing && (
          <button onClick={open} className="btn-secondary btn-sm">Editar</button>
        )}
      </div>

      {loading && <p className="text-sm text-slate-400">Cargando horario...</p>}

      {!editing && !loading && (
        byDay.size > 0 ? (
          <dl className="divide-y divide-slate-100">
            {WEEK_ORDER.map((d) => (
              <div key={d} className="flex justify-between gap-4 py-2 text-sm">
                <dt className="font-medium text-slate-600">{DAY_NAMES[d]}</dt>
                <dd className={byDay.has(d) ? 'text-right font-black text-slate-900' : 'text-slate-400'}>
                  {byDay.has(d) ? formatRanges(byDay.get(d)!) : 'Libre'}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-slate-400">Sin horario. Configúralo para empezar a recibir citas.</p>
        )
      )}

      {editing && (
        <div className="space-y-1">
          {WEEK_ORDER.map((d) => {
            const ranges = draft[d];
            const active = ranges.length > 0;
            return (
              <div key={d} className="schedule-day">
                <label className="schedule-day-name">
                  <input type="checkbox" checked={active} onChange={() => toggleDay(d)} className="h-4 w-4" />
                  <span>{DAY_NAMES[d]}</span>
                </label>

                {!active && <span className="text-sm text-slate-400">Libre</span>}

                {active && (
                  <div className="schedule-ranges">
                    {ranges.map((r, i) => (
                      <div key={i} className="schedule-range">
                        <input
                          type="time" value={r.startTime} step={1800}
                          aria-label={`${DAY_NAMES[d]}, tramo ${i + 1}, desde`}
                          onChange={(e) => updateRange(d, i, 'startTime', e.target.value)}
                          className="input-field input-time"
                        />
                        <span className="text-sm text-slate-400">a</span>
                        <input
                          type="time" value={r.endTime} step={1800}
                          aria-label={`${DAY_NAMES[d]}, tramo ${i + 1}, hasta`}
                          onChange={(e) => updateRange(d, i, 'endTime', e.target.value)}
                          className="input-field input-time"
                        />
                        {ranges.length > 1 && (
                          <button type="button" onClick={() => removeRange(d, i)} className="link-danger text-xs font-bold"
                            aria-label={`Quitar tramo ${i + 1} del ${DAY_NAMES[d]}`}>
                            Quitar
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-4">
                      <button type="button" onClick={() => addRange(d)} className="text-xs font-bold text-slate-600 hover:text-slate-900 underline">
                        + Añadir tramo
                      </button>
                      <button type="button" onClick={() => copyToWorkingDays(d)} className="text-xs font-bold text-slate-600 hover:text-slate-900 underline">
                        Copiar a los demás días activos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {noDays && (
            <p className="pt-2 text-sm text-slate-400">Sin días activos: nadie podrá reservar contigo hasta que actives alguno.</p>
          )}
          {error && <p role="alert" className="pt-2 text-sm font-medium text-red-600">{error}</p>}

          <div className="flex gap-3 pt-3">
            <button onClick={handleSave} disabled={save.isPending} className="btn-primary px-5">
              {save.isPending ? 'Guardando...' : 'Guardar horario'}
            </button>
            <button onClick={() => setEditing(false)} disabled={save.isPending} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
