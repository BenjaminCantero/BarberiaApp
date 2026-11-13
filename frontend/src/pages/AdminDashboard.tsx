import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppNavbar } from '../components/AppNavbar';
import { PortfolioModeration } from '../components/PortfolioModeration';
import { useAdminAppointments, useAdminReports, useAdminServices, useAdminStats, useAdminUsers, useChangeUserRole, useChangeUserStatus, useCreateBarber, useCreateService, useUpdateBarberAccount, useUpdateService } from '../hooks/useAdmin';
import type { AdminUser } from '../api/admin.api';
import { usePortfolioReviewQueue } from '../hooks/usePortfolio';
import { useBarbers } from '../hooks/useBarbers';
import { useAuthStore } from '../store/auth.store';
import { SHOP_TIMEZONE, shopDate, shopTime } from '../lib/agenda';
import { getApiErrorMessage } from '../lib/errors';

type Tab = 'overview' | 'appointments' | 'team' | 'services' | 'portfolio';
type IconName = 'overview' | 'calendar' | 'team' | 'services' | 'gallery' | 'plus';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', timeZone: SHOP_TIMEZONE });
const STATUS_LABEL: Record<string, string> = { PENDING: 'Pendiente', CONFIRMED: 'Confirmada', COMPLETED: 'Completada', CANCELLED: 'Cancelada' };

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: <path d="M4 13h6V4H4v9Zm10 7h6V11h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
    team: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    services: <><path d="M4 7h16M4 12h16M4 17h16M7 4v6M17 9v6M10 14v6" /></>,
    gallery: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg className="admin-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

const firstOfMonth = () => `${shopDate().slice(0, 8)}01`;
const today = () => shopDate();

function LoadingBlock() {
  return <div className="admin-loading" role="status"><span /><span /><span /><p>Cargando datos del estudio…</p></div>;
}

function RevenueChart({ rows }: { rows: Array<{ date: string; revenue: number }> }) {
  if (!rows.length) return <div className="admin-empty"><strong>Aún no hay ingresos en este periodo.</strong><span>Las citas completadas aparecerán aquí.</span></div>;
  const width = 760, height = 220, pad = 22;
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  const points = rows.map((row, index) => ({ ...row, x: rows.length === 1 ? width / 2 : pad + (index / (rows.length - 1)) * (width - pad * 2), y: height - pad - (row.revenue / max) * (height - pad * 2) }));
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  return <div className="revenue-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ingresos diarios"><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--ink)' }} stopOpacity=".2" /><stop offset="1" style={{ stopColor: 'var(--ink)' }} stopOpacity="0" /></linearGradient></defs><path d={`M${pad} ${height * .25}H${width - pad}M${pad} ${height * .5}H${width - pad}M${pad} ${height * .75}H${width - pad}`} className="chart-grid" /><polygon points={`${pad},${height - pad} ${line} ${width - pad},${height - pad}`} fill="url(#revenue-fill)" /><polyline points={line} className="chart-line" />{points.map((p) => <circle key={p.date} cx={p.x} cy={p.y} r="4"><title>{shortDate.format(new Date(`${p.date}T12:00:00`))}: {CLP.format(p.revenue)}</title></circle>)}</svg><div className="chart-axis"><span>{shortDate.format(new Date(`${rows[0].date}T12:00:00`))}</span><span>{shortDate.format(new Date(`${rows[rows.length - 1].date}T12:00:00`))}</span></div></div>;
}

function Overview({ goTo }: { goTo: (tab: Tab) => void }) {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data, isLoading } = useAdminReports({ from: firstOfMonth(), to: today() });
  const { data: appointments } = useAdminAppointments({ page: 1 });
  if (statsLoading || isLoading || !stats || !data) return <LoadingBlock />;
  const statusTotal = Math.max(1, data.total);
  const statuses = [{ key: 'completed', label: 'Completadas', value: data.status.completed }, { key: 'confirmed', label: 'Confirmadas', value: data.status.confirmed }, { key: 'pending', label: 'Pendientes', value: data.status.pending }, { key: 'cancelled', label: 'Canceladas', value: data.status.cancelled }];
  return <div className="admin-stack">
    <section className="admin-summary" aria-label="Resumen del mes"><div className="summary-primary"><span>Ingresos del mes</span><strong>{CLP.format(data.revenue)}</strong><p className={data.revenueChange >= 0 ? 'trend-up' : 'trend-down'}>{data.revenueChange >= 0 ? 'Subió' : 'Bajó'} {Math.abs(data.revenueChange)}% frente al periodo anterior</p></div><dl className="summary-metrics"><div><dt>Citas atendidas</dt><dd>{data.completed}</dd></div><div><dt>Ticket promedio</dt><dd>{CLP.format(data.averageTicket)}</dd></div><div><dt>Asistencia</dt><dd>{data.completionRate}%</dd></div><div><dt>Clientes nuevos</dt><dd>{data.newClients}</dd></div></dl></section>
    <section className="admin-data-grid"><article className="admin-block chart-block"><div className="block-heading"><div><h2>Movimiento de ingresos</h2><p>Solo considera citas completadas.</p></div><span>Mes actual</span></div><RevenueChart rows={data.revenueByDay} /></article><article className="admin-block status-block"><div className="block-heading"><div><h2>Estado de las citas</h2><p>{data.total} reservas en el periodo</p></div></div><div className="status-meter" aria-hidden="true">{statuses.map((s) => <span key={s.key} className={`status-${s.key}`} style={{ width: `${(s.value / statusTotal) * 100}%` }} />)}</div><dl className="status-list">{statuses.map((s) => <div key={s.key}><dt><i className={`status-${s.key}`} />{s.label}</dt><dd>{s.value}<small>{Math.round((s.value / statusTotal) * 100)}%</small></dd></div>)}</dl></article></section>
    <section className="admin-data-grid lower-grid"><article className="admin-block ranking-block"><div className="block-heading"><div><h2>Rendimiento del equipo</h2><p>Ordenado por ingresos generados.</p></div><button onClick={() => goTo('team')}>Gestionar equipo</button></div>{data.topBarbers.length ? <ol>{data.topBarbers.slice(0, 5).map((barber, i) => <li key={barber.id}><span className="rank-number">{i + 1}</span><div><strong>{barber.name}</strong><small>{barber.count} citas completadas</small></div><b>{CLP.format(barber.revenue)}</b></li>)}</ol> : <div className="admin-empty compact">Sin citas completadas todavía.</div>}</article><article className="admin-block recent-block"><div className="block-heading"><div><h2>Actividad reciente</h2><p>Últimas reservas registradas.</p></div><button onClick={() => goTo('appointments')}>Ver agenda</button></div><div className="recent-list">{appointments?.appointments.slice(0, 5).map((a) => <div key={a.id}><time>{shopDate(a.startAt).slice(8)}<small>{shopTime(a.startAt)}</small></time><div><strong>{a.client.name}</strong><small>{a.service.name} con {a.barber.user.name}</small></div><span className={`admin-status status-${a.status.toLowerCase()}`}>{STATUS_LABEL[a.status]}</span></div>)}</div></article></section>
    <section className="admin-foot-stats"><span><strong>{stats.totalUsers}</strong> usuarios registrados</span><span><strong>{stats.totalBarbers}</strong> barberos activos</span><span><strong>{stats.appointments.pending}</strong> citas requieren atención</span></section>
  </div>;
}

function TeamPanel() {
  const [page, setPage] = useState(1), [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', bio: '' });
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', password: '' });
  const { data, isLoading } = useAdminUsers(page);
  const createBarber = useCreateBarber(), updateBarber = useUpdateBarberAccount(), changeRole = useChangeUserRole(), changeStatus = useChangeUserStatus();
  const submit = async (e: React.FormEvent) => { e.preventDefault(); try { await createBarber.mutateAsync(form); toast.success('Barbero creado. Ya puede ingresar con sus datos.'); setForm({ name: '', email: '', phone: '', password: '', bio: '' }); setShowForm(false); } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo crear el barbero')); } };
  const promote = async (userId: string) => { try { await createBarber.mutateAsync({ userId }); toast.success('Perfil de barbero creado'); } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo crear el perfil')); } };
  const startEdit = (user: AdminUser) => {
    if (!user.barber) return;
    setShowForm(false);
    setEditingBarberId(user.barber.id);
    setEditForm({ name: user.name, email: user.email, phone: user.phone ?? '', password: '' });
  };
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarberId) return;
    try {
      await updateBarber.mutateAsync({
        barberId: editingBarberId,
        data: {
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim() || null,
          ...(editForm.password ? { password: editForm.password } : {}),
        },
      });
      toast.success(editForm.password ? 'Datos actualizados y sesiones cerradas' : 'Datos del barbero actualizados');
      setEditingBarberId(null);
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudieron actualizar los datos')); }
  };
  return <div className="admin-stack"><div className="section-action"><div><h2>Equipo y usuarios</h2><p>Crea accesos para barberos o administra las cuentas existentes.</p></div><button className="btn-primary" onClick={() => { setEditingBarberId(null); setShowForm((v) => !v); }}><Icon name="plus" />{showForm ? 'Cerrar formulario' : 'Nuevo barbero'}</button></div>
    {showForm && <form className="admin-form" onSubmit={submit}><div className="form-heading"><h3>Crear acceso de barbero</h3><p>La cuenta quedará activa y lista para iniciar sesión.</p></div><label><span>Nombre completo</span><input className="input-field" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label><span>Correo</span><input className="input-field" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label><span>Teléfono</span><input className="input-field" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label><span>Contraseña inicial</span><input className="input-field" required type="password" minLength={8} pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}" title="Mínimo 8 caracteres, una mayúscula y un número" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><small>Mínimo 8 caracteres, una mayúscula y un número.</small></label><label className="form-wide"><span>Presentación</span><textarea className="input-field" maxLength={500} rows={3} placeholder="Especialidad, experiencia y estilo de trabajo…" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label><div className="form-actions form-wide"><button className="btn-primary" disabled={createBarber.isPending}>{createBarber.isPending ? 'Creando cuenta…' : 'Crear barbero'}</button><button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button></div></form>}
    {editingBarberId && <form className="admin-form" onSubmit={submitEdit}><div className="form-heading"><h3>Editar cuenta de barbero</h3><p>Cambia sus datos de acceso. La contraseña solo se reemplaza si completas ese campo.</p></div><label><span>Nombre completo</span><input className="input-field" required minLength={2} maxLength={100} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label><label><span>Correo</span><input className="input-field" required type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></label><label><span>Teléfono</span><input className="input-field" type="tel" maxLength={30} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></label><label><span>Nueva contraseña (opcional)</span><input className="input-field" type="password" minLength={8} pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}" autoComplete="new-password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} /><small>Mínimo 8 caracteres, una mayúscula y un número. Cerrará sus sesiones activas.</small></label><div className="form-actions form-wide"><button className="btn-primary" disabled={updateBarber.isPending}>{updateBarber.isPending ? 'Guardando cambios…' : 'Guardar cambios'}</button><button type="button" className="btn-secondary" onClick={() => setEditingBarberId(null)}>Cancelar</button></div></form>}
    {isLoading ? <LoadingBlock /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Persona</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{data?.users.map((u) => <tr key={u.id}><td><strong>{u.name}</strong><small>{u.email}{u.phone ? ` · ${u.phone}` : ''}</small></td><td><select value={u.role} aria-label={`Rol de ${u.name}`} onChange={(e) => changeRole.mutate({ userId: u.id, role: e.target.value })}><option value="CLIENT">Cliente</option><option value="BARBER">Barbero</option><option value="ADMIN">Administrador</option></select></td><td><span className={`admin-status ${u.isActive ? 'status-confirmed' : 'status-cancelled'}`}>{u.isActive ? 'Activo' : 'Inactivo'}</span></td><td><div className="table-actions"><button onClick={() => changeStatus.mutate({ userId: u.id, isActive: !u.isActive })}>{u.isActive ? 'Desactivar' : 'Activar'}</button>{!u.barber && u.role !== 'ADMIN' && <button onClick={() => promote(u.id)}>Crear perfil de barbero</button>}{u.barber && <button onClick={() => startEdit(u)}>Editar datos y contraseña</button>}</div></td></tr>)}</tbody></table></div>}
    {data && data.pages > 1 && <Pagination page={page} pages={data.pages} total={`${data.total} usuarios`} setPage={setPage} />}
  </div>;
}

function ServicesPanel() {
  const { data: services, isLoading } = useAdminServices(); const createService = useCreateService(), updateService = useUpdateService();
  const [editing, setEditing] = useState<string | null>(null), [showForm, setShowForm] = useState(false), [form, setForm] = useState({ name: '', description: '', durationMin: 30, price: 0 });
  const reset = () => { setEditing(null); setShowForm(false); setForm({ name: '', description: '', durationMin: 30, price: 0 }); };
  const edit = (s: NonNullable<typeof services>[number]) => { setEditing(s.id); setShowForm(true); setForm({ name: s.name, description: s.description ?? '', durationMin: s.durationMin, price: Number(s.price) }); };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); try { editing ? await updateService.mutateAsync({ id: editing, data: form }) : await createService.mutateAsync(form); toast.success(editing ? 'Servicio actualizado' : 'Servicio creado'); reset(); } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo guardar el servicio')); } };
  return <div className="admin-stack"><div className="section-action"><div><h2>Servicios</h2><p>Define la oferta, duración y precio visible al reservar.</p></div><button className="btn-primary" onClick={() => showForm ? reset() : setShowForm(true)}><Icon name="plus" />{showForm ? 'Cerrar formulario' : 'Nuevo servicio'}</button></div>{showForm && <form className="admin-form service-form" onSubmit={submit}><div className="form-heading form-wide"><h3>{editing ? 'Editar servicio' : 'Crear servicio'}</h3></div><label><span>Nombre</span><input className="input-field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label><span>Duración (minutos)</span><input className="input-field" type="number" min={10} max={240} required value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} /></label><label><span>Precio en pesos</span><input className="input-field" type="number" min={0} step={500} required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label><label className="form-wide"><span>Descripción</span><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="form-actions form-wide"><button className="btn-primary">Guardar servicio</button><button type="button" className="btn-secondary" onClick={reset}>Cancelar</button></div></form>}{isLoading ? <LoadingBlock /> : <div className="service-list">{services?.map((s) => <article key={s.id}><div><strong>{s.name}</strong><p>{s.description || 'Sin descripción'}</p></div><span>{s.durationMin} min</span><b>{CLP.format(Number(s.price))}</b><span className={`admin-status ${s.isActive ? 'status-confirmed' : 'status-cancelled'}`}>{s.isActive ? 'Activo' : 'Pausado'}</span><div className="table-actions"><button onClick={() => edit(s)}>Editar</button><button onClick={() => updateService.mutate({ id: s.id, data: { isActive: !s.isActive } })}>{s.isActive ? 'Pausar' : 'Activar'}</button></div></article>)}</div>}</div>;
}

function Pagination({ page, pages, total, setPage }: { page: number; pages: number; total: string; setPage: React.Dispatch<React.SetStateAction<number>> }) { return <div className="pagination"><span>{total} · página {page} de {pages}</span><div><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button><button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button></div></div>; }

function AppointmentsPanel() {
  const [status, setStatus] = useState(''), [barberId, setBarberId] = useState(''), [date, setDate] = useState(''), [page, setPage] = useState(1);
  const { data, isLoading } = useAdminAppointments({ status: status || undefined, barberId: barberId || undefined, date: date || undefined, page }); const { data: barbers } = useBarbers();
  return <div className="admin-stack"><div className="section-action"><div><h2>Agenda general</h2><p>Consulta todas las reservas en horario de Nueva Imperial.</p></div><span className="timezone-note">{SHOP_TIMEZONE}</span></div><div className="admin-filters"><label><span>Estado</span><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Todos</option>{Object.entries(STATUS_LABEL).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label><label><span>Barbero</span><select value={barberId} onChange={(e) => { setBarberId(e.target.value); setPage(1); }}><option value="">Todo el equipo</option>{barbers?.map((b) => <option key={b.id} value={b.id}>{b.user.name}</option>)}</select></label><label><span>Fecha</span><input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} /></label>{(status || barberId || date) && <button onClick={() => { setStatus(''); setBarberId(''); setDate(''); setPage(1); }}>Limpiar filtros</button>}</div>{isLoading ? <LoadingBlock /> : data?.appointments.length ? <div className="admin-table-wrap"><table className="admin-table appointments-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Servicio</th><th>Barbero</th><th>Estado</th></tr></thead><tbody>{data.appointments.map((a) => <tr key={a.id}><td><strong>{shopDate(a.startAt)}</strong><small>{shopTime(a.startAt)}–{shopTime(a.endAt)}</small></td><td><strong>{a.client.name}</strong><small>{a.client.phone || a.client.email}</small></td><td><strong>{a.service.name}</strong><small>{CLP.format(Number(a.service.price))}</small></td><td>{a.barber.user.name}</td><td><span className={`admin-status status-${a.status.toLowerCase()}`}>{STATUS_LABEL[a.status]}</span></td></tr>)}</tbody></table></div> : <div className="admin-empty"><strong>No encontramos citas.</strong><span>Prueba con otro estado, fecha o barbero.</span></div>}{data && data.pages > 1 && <Pagination page={page} pages={data.pages} total={`${data.total} citas`} setPage={setPage} />}</div>;
}

const NAV: Array<{ id: Tab; label: string; icon: IconName }> = [{ id: 'overview', label: 'Resumen', icon: 'overview' }, { id: 'appointments', label: 'Agenda', icon: 'calendar' }, { id: 'team', label: 'Equipo', icon: 'team' }, { id: 'services', label: 'Servicios', icon: 'services' }, { id: 'portfolio', label: 'Galería', icon: 'gallery' }];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview'); const { user } = useAuthStore(); const { data: queue } = usePortfolioReviewQueue('PENDING');
  const dateLabel = useMemo(() => new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: SHOP_TIMEZONE }).format(new Date()), []);
  const activeLabel = NAV.find((item) => item.id === tab)?.label;
  return <div className="min-h-screen"><AppNavbar /><div className="admin-shell"><aside className="admin-rail"><div className="admin-rail-brand"><img src="/brand/dragon-logo.webp" alt="" /><div><strong>Administración</strong><span>Dragon Studio</span></div></div><nav aria-label="Panel de administración">{NAV.map((item) => <button key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'portfolio' && !!queue?.length && <b>{queue.length}</b>}</button>)}</nav><div className="rail-note"><span>Sesión activa</span><strong>{user?.name}</strong><small>Administrador</small></div></aside><main className="admin-main"><header className="admin-page-head"><div><h1>{tab === 'overview' ? `Hola, ${user?.name?.split(' ')[0] ?? 'Administrador'}` : activeLabel}</h1><p>{tab === 'overview' ? `Así está funcionando el estudio este ${dateLabel}.` : 'Administra la operación del estudio desde un solo lugar.'}</p></div>{tab === 'overview' && <button className="head-action" onClick={() => setTab('team')}><Icon name="plus" />Agregar barbero</button>}</header><div className="admin-mobile-nav" role="tablist" aria-label="Secciones">{NAV.map((item) => <button role="tab" aria-selected={tab === item.id} key={item.id} onClick={() => setTab(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'portfolio' && !!queue?.length && <b>{queue.length}</b>}</button>)}</div>{tab === 'overview' && <Overview goTo={setTab} />}{tab === 'appointments' && <AppointmentsPanel />}{tab === 'team' && <TeamPanel />}{tab === 'services' && <ServicesPanel />}{tab === 'portfolio' && <PortfolioModeration />}</main></div></div>;
}
