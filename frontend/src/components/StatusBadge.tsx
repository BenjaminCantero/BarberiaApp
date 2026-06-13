import type { AppointmentStatus } from '../api/appointment.api';

const CONFIG: Record<AppointmentStatus, { label: string; classes: string }> = {
  PENDING:   { label: 'Pendiente',  classes: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Confirmada', classes: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelada',  classes: 'bg-red-100 text-red-800' },
  COMPLETED: { label: 'Completada', classes: 'bg-gray-100 text-gray-700' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, classes } = CONFIG[status];
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${classes}`}>
      {label}
    </span>
  );
}
