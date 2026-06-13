import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBarbers } from '../hooks/useBarbers';
import { BarberCard } from '../components/BarberCard';

export function Barbers() {
  const { data: barbers, isLoading, isError } = useBarbers();
  const [search, setSearch] = useState('');

  const filtered = barbers?.filter((b) =>
    b.user.name.toLowerCase().includes(search.toLowerCase()) ||
    b.services.some((s) => s.service.name.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-brand-600">BarberBook</Link>
        <div className="flex gap-4">
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">Entrar</Link>
          <Link to="/register" className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
            Registro
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nuestros barberos</h1>
          <p className="text-gray-500">Elige tu barbero favorito y reserva tu cita</p>
        </div>

        {/* Búsqueda */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre o servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="flex gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-12 text-red-500">
            Error al cargar los barberos. Intenta nuevamente.
          </div>
        )}

        {!isLoading && filtered?.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No se encontraron barberos con ese criterio.
          </div>
        )}

        {!isLoading && filtered && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((barber) => (
              <BarberCard key={barber.id} barber={barber} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
