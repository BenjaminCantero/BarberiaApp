import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useLogout } from '../hooks/useAuth';
import {
  useAdminStats,
  useAdminUsers,
  useChangeUserRole,
  useChangeUserStatus,
  useCreateBarber,
  useAdminAppointments,
  useAdminServices,
  useCreateService,
  useUpdateService,
} from '../hooks/useAdmin';
import type { AdminUser } from '../api/admin.api';

type Tab = 'overview' | 'users' | 'services' | 'appointments';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatsOverview() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) return <p className="text-slate-400">Cargando estadísticas...</p>;
  if (!stats) return null;

  const cards = [
    { label: 'Usuarios totales', value: stats.totalUsers, color: 'text-slate-900' },
    { label: 'Barberos activos', value: stats.totalBarbers, color: 'text-brand-700' },
    { label: 'Citas pendientes', value: stats.appointments.pending, color: 'text-yellow-600' },
    { label: 'Confirmadas', value: stats.appointments.confirmed, color: 'text-emerald-600' },
    { label: 'Completadas', value: stats.appointments.completed, color: 'text-blue-600' },
    { label: 'Total citas', value: stats.appointments.total, color: 'text-slate-700' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="panel p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">{c.label}</p>
          <p className={`mt-2 text-4xl font-black ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function UsersPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminUsers(page);
  const changeRole = useChangeUserRole();
  const changeStatus = useChangeUserStatus();
  const createBarber = useCreateBarber();

  const [creatingBarber, setCreatingBarber] = useState<AdminUser | null>(null);
  const [barberBio, setBarberBio] = useState('');

  const handleCreateBarber = async () => {
    if (!creatingBarber) return;
    await createBarber.mutateAsync({ userId: creatingBarber.id, bio: barberBio });
    setCreatingBarber(null);
    setBarberBio('');
  };

  if (isLoading) return <p className="text-slate-400">Cargando usuarios...</p>;

  return (
    <div className="space-y-4">
      {/* Modal crear barbero */}
      {creatingBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-slate-900">
              Crear barbero: {creatingBarber.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              El usuario pasará a tener rol <strong>BARBER</strong>.
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                Biografía (opcional)
              </label>
              <textarea
                className="input-field min-h-[80px] resize-y"
                value={barberBio}
                onChange={(e) => setBarberBio(e.target.value)}
                placeholder="Especialista en cortes clásicos..."
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                className="btn-primary flex-1"
                onClick={handleCreateBarber}
                disabled={createBarber.isPending}
              >
                {createBarber.isPending ? 'Creando...' : 'Confirmar'}
              </button>
              <button
                className="btn-secondary flex-1"
                onClick={() => {
                  setCreatingBarber(null);
                  setBarberBio('');
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-black uppercase tracking-widest text-slate-500">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.users.map((u) => (
              <tr key={u.id} className="bg-white hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold"
                    value={u.role}
                    onChange={(e) =>
                      changeRole.mutate({ userId: u.id, role: e.target.value })
                    }
                  >
                    <option value="CLIENT">CLIENT</option>
                    <option value="BARBER">BARBER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}
                  >
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                      onClick={() =>
                        changeStatus.mutate({ userId: u.id, isActive: !u.isActive })
                      }
                    >
                      {u.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                    {u.role === 'CLIENT' && !u.barber && (
                      <button
                        className="text-xs font-bold text-brand-600 hover:text-brand-800 underline"
                        onClick={() => setCreatingBarber(u)}
                      >
                        Hacer barbero
                      </button>
                    )}
                    {u.barber && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600">
                        Barbero
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {data.total} usuarios · página {data.page} de {data.pages}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary px-3 py-1 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="btn-secondary px-3 py-1 text-xs"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ServicesPanel() {
  const { data: services, isLoading } = useAdminServices();
  const createSvc = useCreateService();
  const updateSvc = useUpdateService();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    durationMin: 30,
    price: 0,
  });

  const resetForm = () => {
    setForm({ name: '', description: '', durationMin: 30, price: 0 });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateSvc.mutateAsync({ id: editingId, data: form });
    } else {
      await createSvc.mutateAsync(form);
    }
    resetForm();
  };

  const startEdit = (svc: {
    id: string;
    name: string;
    description?: string;
    durationMin: number;
    price: string;
  }) => {
    setEditingId(svc.id);
    setForm({
      name: svc.name,
      description: svc.description ?? '',
      durationMin: svc.durationMin,
      price: parseFloat(svc.price),
    });
    setShowForm(true);
  };

  if (isLoading) return <p className="text-slate-400">Cargando servicios...</p>;

  return (
    <div className="space-y-4">
      {!showForm && (
        <button
          className="btn-primary px-5"
          onClick={() => setShowForm(true)}
        >
          + Nuevo servicio
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="panel p-5 space-y-3">
          <h3 className="font-black text-slate-900">
            {editingId ? 'Editar servicio' : 'Nuevo servicio'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                Nombre
              </label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                Descripción (opcional)
              </label>
              <input
                className="input-field"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                Duración (min)
              </label>
              <input
                className="input-field"
                type="number"
                min={10}
                max={240}
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                Precio (€)
              </label>
              <input
                className="input-field"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary px-5"
              disabled={createSvc.isPending || updateSvc.isPending}
            >
              {createSvc.isPending || updateSvc.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="btn-secondary px-5" onClick={resetForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-black uppercase tracking-widest text-slate-500">
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Duración</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services?.map((s) => (
              <tr key={s.id} className="bg-white hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{s.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.durationMin} min</td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {parseFloat(s.price).toFixed(2)} €
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {s.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      className="text-xs font-bold text-brand-600 hover:text-brand-800 underline"
                      onClick={() => startEdit(s)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-xs font-bold text-red-500 hover:text-red-700 underline"
                      onClick={() =>
                        updateSvc.mutate({ id: s.id, data: { isActive: !s.isActive } })
                      }
                    >
                      {s.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppointmentsPanel() {
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminAppointments({
    status: statusFilter || undefined,
    date: dateFilter || undefined,
    page,
  });

  const clearFilters = () => {
    setStatusFilter('');
    setDateFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="CONFIRMED">Confirmada</option>
          <option value="COMPLETED">Completada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
        <input
          type="date"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
        />
        {(statusFilter || dateFilter) && (
          <button
            className="text-sm font-bold text-slate-500 hover:text-slate-900 underline"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-slate-400">Cargando citas...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Barbero</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.appointments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No hay citas con estos filtros.
                    </td>
                  </tr>
                )}
                {data?.appointments.map((a) => {
                  const dt = new Date(a.startAt);
                  const dateStr = dt.toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  });
                  const timeStr = dt.toLocaleTimeString('es-ES', {
                    hour: '2-digit', minute: '2-digit',
                  });
                  return (
                    <tr key={a.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{dateStr}</p>
                        <p className="text-xs text-slate-400">{timeStr}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{a.client.name}</p>
                        <p className="text-xs text-slate-400">{a.client.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{a.barber.user.name}</td>
                      <td className="px-4 py-3 text-slate-700">{a.service.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[a.status]}`}
                        >
                          {STATUS_LABEL[a.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {data.total} citas · página {data.page} de {data.pages}
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary px-3 py-1 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <button
                  className="btn-secondary px-3 py-1 text-xs"
                  disabled={page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user } = useAuthStore();
  const logout = useLogout();
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Resumen' },
    { id: 'users', label: 'Usuarios' },
    { id: 'services', label: 'Servicios' },
    { id: 'appointments', label: 'Citas' },
  ];

  return (
    <div className="app-shell">
      <nav className="app-nav flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="brand-mark">
          <span className="brand-icon">BB</span>
          <span>BarberBook</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {user?.name}
          </Link>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
            ADMIN
          </span>
          <button
            onClick={() => logout.mutate()}
            className="text-sm font-bold text-red-600 hover:underline"
          >
            Salir
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <p className="section-eyebrow">Panel administrador</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">
            Bienvenido, {user?.name?.split(' ')[0]}
          </h1>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[80px] rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && <StatsOverview />}
        {tab === 'users' && <UsersPanel />}
        {tab === 'services' && <ServicesPanel />}
        {tab === 'appointments' && <AppointmentsPanel />}
      </main>
    </div>
  );
}

