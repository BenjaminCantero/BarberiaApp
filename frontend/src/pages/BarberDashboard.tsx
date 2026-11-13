import { useState, useRef } from 'react';
import { AppNavbar } from '../components/AppNavbar';
import { useAuthStore } from '../store/auth.store';
import { useMyBarber, useBarberSchedule } from '../hooks/useBarbers';
import { useMyAppointments } from '../hooks/useAppointments';
import { BarberAgenda } from '../components/BarberAgenda';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { ScheduleBlocks } from '../components/ScheduleBlocks';
import { useCertificates, useUploadCertificate, useDeleteCertificate } from '../hooks/useCertificates';
import { PortfolioManager } from '../components/PortfolioManager';
import { BarberProfileForm } from '../components/BarberProfileForm';

export function BarberDashboard() {
  const { user } = useAuthStore();

  const { data: myBarber, isLoading: loadingBarber } = useMyBarber();
  const { data: schedule, isLoading: loadingSchedule } = useBarberSchedule(myBarber?.id ?? '');
  // Pendientes por confirmar (de hoy en adelante, cualquier día).
  const { data: pending } = useMyAppointments({ status: 'PENDING' });
  const [activeTab, setActiveTab] = useState<'agenda' | 'portfolio' | 'profile' | 'schedule' | 'services' | 'certificates'>('agenda');

  // Certificados
  const { data: certificates, isLoading: loadingCerts } = useCertificates(myBarber?.id ?? '');
  const uploadCert = useUploadCertificate(myBarber?.id ?? '');
  const deleteCert = useDeleteCertificate(myBarber?.id ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [certTitle, setCertTitle] = useState('');
  const [certDesc, setCertDesc] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certMsg, setCertMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pendingCount = pending?.filter((a) => new Date(a.endAt) > new Date()).length ?? 0;

  return (
    <div className="app-shell">
      <AppNavbar />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="dash-hero mb-6 flex flex-wrap items-center justify-between gap-4">
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
        <div className="tabs mb-6" role="tablist">
          {(['agenda', 'portfolio', 'profile', 'schedule', 'services', 'certificates'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'is-active' : ''}
            >
              {{ agenda: 'Agenda', portfolio: 'Mis trabajos', profile: 'Perfil', schedule: 'Horario', services: 'Servicios', certificates: 'Diplomas' }[tab]}
            </button>
          ))}
        </div>

        {/* AGENDA */}
        {activeTab === 'agenda' && myBarber && <BarberAgenda barberId={myBarber.id} schedule={schedule} />}
        {activeTab === 'agenda' && loadingBarber && <div className="panel h-28 animate-pulse" />}

        {/* HORARIO */}
        {activeTab === 'schedule' && myBarber && (
          <div className="space-y-6">
            <ScheduleEditor
              barberId={myBarber.id}
              schedule={schedule}
              loading={loadingSchedule}
            />
            <ScheduleBlocks barberId={myBarber.id} />
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
        {/* PERFIL PÚBLICO */}
        {activeTab === 'profile' && myBarber && <BarberProfileForm barber={myBarber} />}

        {/* PORTAFOLIO */}
        {activeTab === 'portfolio' && myBarber && <PortfolioManager barberId={myBarber.id} />}

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
                  Archivo (JPG, PNG o PDF · máx. 4 MB)
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
                            src={cert.fileUrl}
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
                          href={cert.fileUrl}
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
