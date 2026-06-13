import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useLogout } from '../hooks/useAuth';
import { useMyBarber, useBarberSchedule, useSetSchedule } from '../hooks/useBarbers';
import { useMyAppointments } from '../hooks/useAppointments';
import { AppointmentCard } from '../components/AppointmentCard';
import { useCertificates, useUploadCertificate, useDeleteCertificate } from '../hooks/useCertificates';

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
  const [activeTab, setActiveTab] = useState<'agenda' | 'schedule' | 'services' | 'certificates'>('agenda');

  // Certificados
  const { data: certificates, isLoading: loadingCerts } = useCertificates(myBarber?.id ?? '');
  const uploadCert = useUploadCertificate(myBarber?.id ?? '');
  const deleteCert = useDeleteCertificate(myBarber?.id ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [certTitle, setCertTitle] = useState('');
  const [certDesc, setCertDesc] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certMsg, setCertMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {(['agenda', 'schedule', 'services', 'certificates'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {{ agenda: 'Agenda', schedule: 'Horario', services: 'Servicios', certificates: 'Diplomas' }[tab]}
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
        {/* DIPLOMAS / CERTIFICADOS */}
        {activeTab === 'certificates' && (
          <div className="space-y-6">
            {/* Formulario subida */}
            <form
              className="panel p-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setCertMsg(null);
                if (!certFile) { setCertMsg({ ok: false, text: 'Selecciona un archivo.' }); return; }
                try {
                  await uploadCert.mutateAsync({ file: certFile, title: certTitle, description: certDesc || undefined });
                  setCertTitle('');
                  setCertDesc('');
                  setCertFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  setCertMsg({ ok: true, text: 'Diploma subido correctamente.' });
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  setCertMsg({ ok: false, text: msg ?? 'Error al subir el archivo.' });
                }
              }}
            >
              <h2 className="font-black text-slate-900">Subir diploma o certificado</h2>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Título *
                </label>
                <input
                  className="input-field"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  required
                  placeholder="Ej: Máster en Barbería Clásica"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Descripción (opcional)
                </label>
                <input
                  className="input-field"
                  value={certDesc}
                  onChange={(e) => setCertDesc(e.target.value)}
                  placeholder="Centro, año, etc."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Archivo (JPG, PNG o PDF · máx. 10 MB)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-brand-700"
                  onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>

              {certMsg && (
                <p className={`text-sm font-medium ${certMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                  {certMsg.text}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary px-6"
                disabled={uploadCert.isPending}
              >
                {uploadCert.isPending ? 'Subiendo...' : 'Subir archivo'}
              </button>
            </form>

            {/* Lista de certificados */}
            <div className="panel p-6">
              <h2 className="mb-4 font-black text-slate-900">
                Mis diplomas ({certificates?.length ?? 0})
              </h2>

              {loadingCerts && <p className="text-sm text-slate-400">Cargando...</p>}

              {!loadingCerts && !certificates?.length && (
                <p className="text-sm text-slate-400">
                  Aún no has subido ningún diploma o certificado.
                </p>
              )}

              {!loadingCerts && certificates && certificates.length > 0 && (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-start gap-4 rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors"
                    >
                      {/* Miniatura o icono PDF */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center">
                        {cert.fileType === 'image' ? (
                          <img
                            src={`http://localhost:3000${cert.fileUrl}`}
                            alt={cert.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl">📄</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{cert.title}</p>
                        {cert.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{cert.description}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(cert.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <a
                          href={`http://localhost:3000${cert.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-brand-600 hover:text-brand-800 underline"
                        >
                          Ver
                        </a>
                        <button
                          className="text-xs font-bold text-red-500 hover:text-red-700 underline"
                          onClick={() => deleteCert.mutate(cert.id)}
                          disabled={deleteCert.isPending}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
