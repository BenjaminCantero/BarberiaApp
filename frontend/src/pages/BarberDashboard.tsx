import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useLogout } from '../hooks/useAuth';
import { useMyBarber, useBarberSchedule, useSetSchedule } from '../hooks/useBarbers';
import { useMyAppointments } from '../hooks/useAppointments';
import { AppointmentCard } from '../components/AppointmentCard';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function BarberDashboard() {
  const { user } = useAuthStore();
  const logout = useLogout();

  const { data: myBarber, isLoading: loadingBarber } = useMyBarber();
  const { data: schedule } = useBarberSchedule(myBarber?.id ?? '');
  const setScheduleMutation = useSetSchedule(myBarber?.id ?? '');

  const [selectedDate, setSelectedDate] = useState(localDateStr());
  const { data: appointments, isLoading: loadingAppts } = useMyAppointments({ date: selectedDate });

  const [editSchedule, setEditSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(
    [1, 2, 3, 4, 5].map((day) => ({ dayOfWeek: day, startTime: '09:00', endTime: '18:00', isActive: true })),
  );
  const [activeTab, setActiveTab] = useState<'agenda' | 'schedule' | 'services'>('agenda');

  const handleOpenSchedule = () => {
    if (schedule && schedule.length > 0) {
      setScheduleForm(schedule.map((s) => ({
        dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isActive: s.isActive,
      })));
    }
    setEditSchedule(true);
  };

  const handleSaveSchedule = () => {
    setScheduleMutation.mutate(
      scheduleForm.filter((s) => s.isActive),
      { onSuccess: () => setEditSchedule(false) },
    );
  };

  const updateEntry = (day: number, field: string, value: string | boolean) =>
    setScheduleForm((prev) => prev.map((e) => (e.dayOfWeek === day ? { ...e, [field]: value } : e)));

  const toggleDay = (day: number) => {
    const exists = scheduleForm.find((s) => s.dayOfWeek === day);
    if (exists) {
      setScheduleForm((prev) => prev.filter((s) => s.dayOfWeek !== day));
    } else {
      setScheduleForm((prev) =>
        [...prev, { dayOfWeek: day, startTime: '09:00', endTime: '18:00', isActive: true }]
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      );
    }
  };

  const pendingCount = appointments?.filter((a) => a.status === 'PENDING').length ?? 0;

  return (
    <div className="app-shell">
      <nav className="app-nav flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="brand-mark">
          <span className="brand-icon">BB</span>
          <span>BarberBook</span>
        </Link>
        <div className="flex items-center gap-3">
          {myBarber && (
            <Link
              to={`/barbers/${myBarber.id}`}
              className="hidden text-sm font-semibold text-slate-500 hover:text-slate-900 sm:inline"
            >
              Perfil público
            </Link>
          )}
          <Link to="/profile" className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Mi perfil
          </Link>
          <span className="text-sm font-medium text-slate-600">{user?.name?.split(' ')[0]}</span>
          <button onClick={() => logout.mutate()} className="text-sm font-bold text-red-600 hover:underline">
            Salir
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-950 p-6 text-white">
          <div>
            <p className="section-eyebrow text-brand-300">Panel barbero</p>
            <h1 className="mt-2 text-3xl font-black">Bienvenido, {user?.name?.split(' ')[0]}</h1>
          </div>
          {pendingCount > 0 && (
            <span className="rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-black text-yellow-900">
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 w-fit rounded-xl bg-slate-100 p-1">
          {(['agenda', 'schedule', 'services'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
                activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {{ agenda: 'Agenda', schedule: 'Horario', services: 'Servicios' }[tab]}
            </button>
          ))}
        </div>

        {/* AGENDA */}
        {activeTab === 'agenda' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-700">Fecha:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field max-w-xs"
              />
            </div>

            {loadingAppts && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="panel animate-pulse p-5 h-28" />
                ))}
              </div>
            )}

            {!loadingAppts && (!appointments || appointments.length === 0) && (
              <div className="panel p-10 text-center">
                <p className="text-3xl mb-3">📭</p>
                <p className="font-bold text-slate-600">Sin citas este día</p>
              </div>
            )}

            {!loadingAppts && appointments && appointments.length > 0 && (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} viewAs="BARBER" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* HORARIO */}
        {activeTab === 'schedule' && (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-900">Horario semanal</h2>
              {!editSchedule && (
                <button onClick={handleOpenSchedule} className="text-sm font-bold text-brand-700 hover:underline">
                  Editar
                </button>
              )}
            </div>

            {loadingBarber && <p className="text-sm text-slate-400">Cargando horario...</p>}

            {!editSchedule && !loadingBarber && (
              schedule && schedule.length > 0 ? (
                <div className="space-y-1">
                  {schedule.filter((s) => s.isActive).map((s) => (
                    <div key={s.id} className="flex justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
                      <span className="font-medium text-slate-600">{DAY_NAMES[s.dayOfWeek]}</span>
                      <span className="font-black text-slate-900">{s.startTime} – {s.endTime}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin horario. Configúralo para empezar a recibir citas.</p>
              )
            )}

            {editSchedule && (
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const entry = scheduleForm.find((s) => s.dayOfWeek === day);
                  return (
                    <div key={day} className="flex flex-wrap items-center gap-4 border-b border-slate-50 py-2 last:border-0">
                      <label className="flex w-28 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!entry}
                          onChange={() => toggleDay(day)}
                          className="h-4 w-4 accent-brand-600"
                        />
                        <span className="text-sm font-bold text-slate-700">{DAY_NAMES[day]}</span>
                      </label>
                      {entry && (
                        <>
                          <input type="time" value={entry.startTime}
                            onChange={(e) => updateEntry(day, 'startTime', e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-sm" />
                          <span className="text-slate-400 text-sm">a</span>
                          <input type="time" value={entry.endTime}
                            onChange={(e) => updateEntry(day, 'endTime', e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-sm" />
                        </>
                      )}
                    </div>
                  );
                })}
                <div className="flex gap-3 pt-3">
                  <button onClick={handleSaveSchedule} disabled={setScheduleMutation.isPending}
                    className="btn-brand px-5">
                    {setScheduleMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditSchedule(false)} className="text-sm font-bold text-slate-500 hover:text-slate-700">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SERVICIOS */}
        {activeTab === 'services' && (
          <div className="panel p-6">
            <h2 className="mb-4 font-black text-slate-900">Mis servicios</h2>
            {loadingBarber && <p className="text-sm text-slate-400">Cargando...</p>}
            {!loadingBarber && !myBarber?.services.length && (
              <p className="text-sm text-slate-400">No tienes servicios asignados.</p>
            )}
            {!loadingBarber && myBarber?.services && myBarber.services.length > 0 && (
              <div className="space-y-3">
                {myBarber.services.map(({ service }) => (
                  <div key={service.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0">
                    <div>
                      <p className="font-black text-slate-900">{service.name}</p>
                      {service.description && <p className="text-xs text-slate-500">{service.description}</p>}
                      <p className="text-xs text-slate-400">{service.durationMin} min</p>
                    </div>
                    <span className="text-xl font-black text-brand-700">${service.price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
