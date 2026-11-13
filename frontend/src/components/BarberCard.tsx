import { Link } from 'react-router-dom';
import type { Barber } from '../api/barber.api';
import { StarRatingDisplay } from './StarRating';
import { formatPrice } from '../lib/format';
import { DAY_SHORT, WEEK_ORDER, rangesByDay } from '../lib/agenda';

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
    <div className="team-card group">
      <div className="flex items-center gap-4">
        {barber.user.avatarUrl ? (
          <img
            src={barber.user.avatarUrl}
            alt={barber.user.name}
            className="!h-16 !w-16"
          />
        ) : (
          <div className="team-initials !h-16 !w-16 !text-xl" aria-hidden="true">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate">{barber.user.name}</h3>
          {barber.rating && barber.rating.count > 0 ? (
            <StarRatingDisplay value={barber.rating.average} count={barber.rating.count} />
          ) : (
            <p className="text-xs text-slate-400">Sin reseñas aún</p>
          )}
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
            {service.name} · {service.durationMin}min · {formatPrice(service.price)}
          </span>
        ))}
        {barber.services.length > 3 && (
          <span className="text-xs font-semibold text-slate-400">+{barber.services.length - 3} más</span>
        )}
      </div>

      {barber.schedules && barber.schedules.length > 0 && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
          Disponible:{' '}
          {(() => {
            const byDay = rangesByDay(barber.schedules);
            return WEEK_ORDER.filter((d) => byDay.has(d)).map((d) => DAY_SHORT[d]).join(', ');
          })()}
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
