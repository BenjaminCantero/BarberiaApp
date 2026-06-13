import { useState } from 'react';
import { useBarbers } from '../hooks/useBarbers';
import { BarberCard } from '../components/BarberCard';
import { AppNavbar } from '../components/AppNavbar';

export function Barbers() {
  const { data: barbers, isLoading, isError } = useBarbers();
  const [search, setSearch] = useState('');

  const filtered = barbers?.filter((b) =>
    b.user.name.toLowerCase().includes(search.toLowerCase()) ||
    b.services.some((s) => s.service.name.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="app-shell">
      <AppNavbar />

      <main className="page-container">
        <div className="mb-8 grid gap-6 rounded-lg bg-slate-950 px-5 py-8 text-white shadow-2xl shadow-slate-950/20 md:grid-cols-[1fr_21rem] md:p-8">
          <div>
            <p className="section-eyebrow text-brand-300">Catálogo BarberBook</p>
            <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Encuentra tu próximo corte.</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Revisa perfiles, servicios y disponibilidad para reservar con el barbero que mejor calce con tu estilo.
            </p>
          </div>
          <div className="grid content-end gap-2 text-sm text-slate-300">
            <span className="chip w-fit border-brand-400/40 bg-brand-400/10 text-brand-200">
              {filtered?.length ?? 0} disponible{filtered?.length === 1 ? '' : 's'}
            </span>
            <p>Busca por nombre, corte o servicio y entra directo al perfil para reservar.</p>
          </div>
        </div>

        <div className="mb-8">
          <input
            type="text"
            placeholder="Buscar por nombre o servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field max-w-xl shadow-sm"
          />
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="panel p-6 animate-pulse">
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
          <div className="panel py-12 text-center text-red-600">
            Error al cargar los barberos. Intenta nuevamente.
          </div>
        )}

        {!isLoading && filtered?.length === 0 && (
          <div className="panel py-12 text-center text-slate-500">
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
