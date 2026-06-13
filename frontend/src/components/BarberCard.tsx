import { Link } from 'react-router-dom';
import type { Barber } from '../api/barber.api';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface Props {
  barber: Barber;
}

export function BarberCard({ barber }: Props) {
  const initials = barber.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="panel group flex flex-col gap-4 p-5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10">
      <div className="flex items-center gap-4">
        {barber.user.avatarUrl ? (
          <img
            src={barber.user.avatarUrl}
            alt={barber.user.name}
            className="h-16 w-16 rounded-lg object-cover ring-4 ring-brand-100"
          />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-lg bg-slate-950 text-lg font-black text-brand-300 shadow-lg shadow-slate-950/15">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-slate-950">{barber.user.name}</h3>
          {barber.user.phone && (
            <p className="text-sm text-slate-500">{barber.user.phone}</p>
          )}
        </div>
      </div>

      {barber.bio && (
        <p className="line-clamp-2 text-sm leading-6 text-slate-600">{barber.bio}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {barber.services.slice(0, 3).map(({ service }) => (
          <span
            key={service.id}
            className="chip"
          >
            {service.name} · {service.durationMin}min · ${service.price}
          </span>
        ))}
        {barber.services.length > 3 && (
          <span className="text-xs font-semibold text-slate-400">+{barber.services.length - 3} más</span>
        )}
      </div>

      {barber.schedules && barber.schedules.length > 0 && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
          Disponible:{' '}
          {barber.schedules
            .filter((s) => s.isActive)
            .map((s) => DAY_NAMES[s.dayOfWeek])
            .join(', ')}
        </div>
      )}

      <Link
        to={`/barbers/${barber.id}`}
        className="btn-primary mt-auto"
      >
        Ver perfil y reservar
      </Link>
    </div>
  );
}
