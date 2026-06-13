import { useCurrentUser, useLogout } from '../hooks/useAuth';

export function ClientDashboard() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-brand-600">BarberBook</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">Hola, {user?.name ?? '...'}</span>
          <button
            onClick={() => logout.mutate()}
            className="text-sm text-red-600 hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis reservas</h1>

        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-lg font-medium text-gray-600">No tienes citas próximas</p>
          <p className="text-sm mt-1">
            Explora nuestros barberos y reserva tu primera cita.
          </p>
          <a
            href="/barbers"
            className="mt-4 inline-block bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Ver barberos
          </a>
        </div>
      </main>
    </div>
  );
}
