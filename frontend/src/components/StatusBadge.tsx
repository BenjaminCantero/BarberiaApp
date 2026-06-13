import type { AppointmentStatus } from '../api/appointment.api';

const CONFIG: Record<AppointmentStatus, { label: string; classes: string }> = {
  PENDING:   { label: 'Pendiente',  classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  CONFIRMED: { label: 'Confirmada', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CANCELLED: { label: 'Cancelada',  classes: 'bg-red-100 text-red-800 border-red-200' },
  COMPLETED: { label: 'Completada', classes: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, classes } = CONFIG[status];
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${classes}`}>
      {label}
    </span>
  );
}
