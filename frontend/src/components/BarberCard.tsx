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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        {barber.user.avatarUrl ? (
          <img
            src={barber.user.avatarUrl}
            alt={barber.user.name}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-lg font-bold">
            {initials}
          </div>
        )}
        <div>
          <h3 className="font-bold text-gray-900">{barber.user.name}</h3>
          {barber.user.phone && (
            <p className="text-sm text-gray-500">{barber.user.phone}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {barber.bio && (
        <p className="text-sm text-gray-600 line-clamp-2">{barber.bio}</p>
      )}

      {/* Servicios */}
      <div className="flex flex-wrap gap-2">
        {barber.services.slice(0, 3).map(({ service }) => (
          <span
            key={service.id}
            className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full"
          >
            {service.name} · {service.durationMin}min · ${service.price}
          </span>
        ))}
        {barber.services.length > 3 && (
          <span className="text-xs text-gray-400">+{barber.services.length - 3} más</span>
        )}
      </div>

      {/* Horario resumen */}
      {barber.schedules && barber.schedules.length > 0 && (
        <div className="text-xs text-gray-500">
          Disponible:{' '}
          {barber.schedules
            .filter((s) => s.isActive)
            .map((s) => DAY_NAMES[s.dayOfWeek])
            .join(', ')}
        </div>
      )}

      <Link
        to={`/barbers/${barber.id}`}
        className="mt-auto text-center bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
      >
        Ver perfil y reservar
      </Link>
    </div>
  );
}
