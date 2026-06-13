import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useCurrentUser, useLogout } from '../hooks/useAuth';
import { useBarbers, useBarberSchedule, useSetSchedule } from '../hooks/useBarbers';
import { useMyAppointments } from '../hooks/useAppointments';
import { AppointmentCard } from '../components/AppointmentCard';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function BarberDashboard() {
  const { user } = useAuthStore();
  const { data: profile } = useCurrentUser();
  const { data: barbers } = useBarbers();
  const logout = useLogout();

  const myBarber = barbers?.find((b) => b.user.email === profile?.email);

  const { data: schedule } = useBarberSchedule(myBarber?.id ?? '');
  const setScheduleMutation = useSetSchedule(myBarber?.id ?? '');

  const [selectedDate, setSelectedDate] = useState(todayStr());
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
        [...prev, { dayOfWeek: day, startTime: '09:00', endTime: '18:00', isActive: true }].sort(
          (a, b) => a.dayOfWeek - b.dayOfWeek,
        ),
      );
    }
  };

  const pendingCount = appointments?.filter((a) => a.status === 'PENDING').length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-brand-600">BarberBook</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hola, {user?.name ?? '...'}</span>
          <button onClick={() => logout.mutate()} className="text-sm text-red-600 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Panel del barbero</h1>
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-800 text-sm font-semibold px-3 py-1 rounded-full">
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {(['agenda', 'schedule', 'services'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {{ agenda: 'Agenda', schedule: 'Horario', services: 'Servicios' }[tab]}
            </button>
          ))}
        </div>

        {/* --- AGENDA --- */}
        {activeTab === 'agenda' && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Fecha:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {loadingAppts && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-28" />
                ))}
              </div>
            )}

            {!loadingAppts && (!appointments || appointments.length === 0) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                <p className="text-3xl mb-3">📭</p>
                <p className="font-medium text-gray-600">Sin citas este día</p>
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

        {/* --- HORARIO --- */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Mi horario semanal</h2>
              {!editSchedule && (
                <button onClick={handleOpenSchedule} className="text-sm text-brand-600 hover:underline font-medium">
                  Editar
                </button>
              )}
            </div>

            {!editSchedule && (
              schedule && schedule.length > 0 ? (
                <div className="space-y-2">
                  {schedule.filter((s) => s.isActive).map((s) => (
                    <div key={s.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                      <span className="text-gray-600 font-medium">{DAY_NAMES[s.dayOfWeek]}</span>
                      <span className="text-gray-800">{s.startTime} – {s.endTime}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin horario configurado. Edítalo para empezar a recibir citas.</p>
              )
            )}

            {editSchedule && (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const entry = scheduleForm.find((s) => s.dayOfWeek === day);
                  return (
                    <div key={day} className="flex items-center gap-4 flex-wrap py-2 border-b border-gray-50">
                      <label className="flex items-center gap-2 w-28 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!entry}
                          onChange={() => toggleDay(day)}
                          className="accent-brand-600 w-4 h-4"
                        />
                        <span className="text-sm text-gray-700 font-medium">{DAY_NAMES[day]}</span>
                      </label>
                      {entry && (
                        <>
                          <input
                            type="time"
                            value={entry.startTime}
                            onChange={(e) => updateEntry(day, 'startTime', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <span className="text-gray-400 text-sm">a</span>
                          <input
                            type="time"
                            value={entry.endTime}
                            onChange={(e) => updateEntry(day, 'endTime', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveSchedule}
                    disabled={setScheduleMutation.isPending}
                    className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {setScheduleMutation.isPending ? 'Guardando...' : 'Guardar horario'}
                  </button>
                  <button onClick={() => setEditSchedule(false)} className="text-sm text-gray-500 hover:text-gray-700">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- SERVICIOS --- */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4">Mis servicios</h2>
            {!myBarber?.services.length ? (
              <p className="text-sm text-gray-400">No tienes servicios asignados.</p>
            ) : (
              <div className="space-y-3">
                {myBarber.services.map(({ service }) => (
                  <div key={service.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800">{service.name}</p>
                      {service.description && <p className="text-xs text-gray-500">{service.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{service.durationMin} min</p>
                    </div>
                    <span className="text-brand-600 font-bold text-lg">${service.price}</span>
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
