import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useBarber, useAvailability, useMyBarber } from '../hooks/useBarbers';
import { AppNavbar } from '../components/AppNavbar';
import { useCertificates } from '../hooks/useCertificates';
import { useBarberPortfolio } from '../hooks/usePortfolio';
import { PortfolioGallery } from '../components/PortfolioGallery';
import { useBarberReviews } from '../hooks/useReviews';
import { StarRatingDisplay } from '../components/StarRating';
import { DAY_NAMES, WEEK_ORDER, formatRanges, nextWorkingDate, rangesByDay, shopDate } from '../lib/agenda';
import { formatPrice } from '../lib/format';
import { instagramUrl } from '../lib/instagram';
import { InstagramIcon } from '../components/InstagramIcon';
import { PortfolioManager } from '../components/PortfolioManager';
import { useAuthStore } from '../store/auth.store';

export function BarberProfile() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const { user } = useAuthStore();
  const { data: barber, isLoading, isError } = useBarber(id!);
  const { data: myBarber } = useMyBarber(user?.role === 'BARBER');
  const [managingPortfolio, setManagingPortfolio] = useState(false);

  const [selectedDate, setSelectedDate] = useState(shopDate());
  const [selectedServiceId, setSelectedServiceId] = useState<string>(params.get('serviceId') || '');

  // Cuando carga el horario del barbero, saltar al primer día disponible
  useEffect(() => {
    if (barber?.schedules && barber.schedules.length > 0) {
      setSelectedDate(nextWorkingDate(barber.schedules));
    }
  }, [barber?.schedules]);

  const {
    data: slots,
    isLoading: loadingSlots,
    isError: slotsError,
  } = useAvailability(
    id!,
    selectedDate,
    selectedServiceId || undefined,
  );

  const { data: certificates } = useCertificates(id ?? '');
  const { data: reviewsData } = useBarberReviews(id ?? '');
  const { data: portfolio } = useBarberPortfolio(id ?? '');

  if (isLoading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="panel px-6 py-4 text-lg font-semibold text-slate-500">Cargando perfil...</div>
      </div>
    );
  }

  if (isError || !barber) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-lg font-semibold text-red-600">Barbero no encontrado</p>
          <Link to="/barbers" className="font-bold text-brand-700 hover:underline">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  const initials = barber.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-shell">
      <AppNavbar />

      <main className="page-container grid grid-cols-1 gap-8 lg:grid-cols-3">
        {myBarber?.id === barber.id && (
          <section className="profile-owner-tools lg:col-span-3" aria-label="Administrar perfil">
            <div>
              <strong>Este es tu perfil público</strong>
              <span>Sube fotos de tus cortes para que los clientes conozcan tu trabajo.</span>
            </div>
            <button
              type="button"
              className={managingPortfolio ? 'btn-secondary' : 'btn-primary'}
              aria-expanded={managingPortfolio}
              onClick={() => setManagingPortfolio((open) => !open)}
            >
              {managingPortfolio ? 'Cerrar administrador' : 'Subir trabajos'}
            </button>
          </section>
        )}

        {myBarber?.id === barber.id && managingPortfolio && (
          <section className="lg:col-span-3" aria-label="Mis trabajos">
            <PortfolioManager barberId={barber.id} />
          </section>
        )}

        <div className="lg:col-span-1 space-y-6">
          <div className="profile-hero">
            {barber.user.avatarUrl ? (
              <img src={barber.user.avatarUrl} alt={barber.user.name} className="profile-avatar" />
            ) : (
              <div className="profile-avatar" aria-hidden="true">{initials}</div>
            )}
            <p className="section-eyebrow">Barbero · Dragon Studio</p>
            <h1 className="mt-2 text-3xl">{barber.user.name}</h1>
            {barber.rating && barber.rating.count > 0 && (
              <div className="mt-2 flex justify-center">
                <StarRatingDisplay value={barber.rating.average} count={barber.rating.count} size="md" />
              </div>
            )}
            {barber.user.phone && <p className="mt-1 text-sm text-slate-500">{barber.user.phone}</p>}
            {barber.bio && <p className="mt-3 text-sm leading-6 text-slate-600">{barber.bio}</p>}
            {barber.instagram && (
              <a className="ig-link mt-4" href={instagramUrl(barber.instagram)} target="_blank" rel="noreferrer">
                <InstagramIcon /> @{barber.instagram}
              </a>
            )}
          </div>

          {barber.schedules && barber.schedules.length > 0 && (
            <div className="panel p-6">
              <h2 className="mb-3 font-black text-slate-900">Horario</h2>
              <div className="space-y-2">
                {(() => {
                  const byDay = rangesByDay(barber.schedules);
                  return WEEK_ORDER.filter((d) => byDay.has(d)).map((d) => (
                    <div key={d} className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-600">{DAY_NAMES[d]}</span>
                      <span className="text-right font-bold text-slate-900">{formatRanges(byDay.get(d)!)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {certificates && certificates.length > 0 && (
            <div className="panel p-6">
              <p className="section-eyebrow">Formación y certificaciones</p>
              <h2 className="mt-1 mb-5 text-xl font-black text-slate-900">Diplomas y estudios</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certificates.map((cert) => (
                  <a
                    key={cert.id}
                    href={cert.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-3xl border border-slate-200 bg-white p-4 transition hover:shadow-lg"
                  >
                    <div className="mb-3 flex h-24 items-center justify-center rounded-3xl bg-slate-100 text-4xl text-slate-400">
                      {cert.fileType === 'image' ? '🖼️' : '📄'}
                    </div>
                    <p className="text-sm font-bold text-slate-900">{cert.title}</p>
                    {cert.description && (
                      <p className="mt-1 text-xs text-slate-500">{cert.description}</p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="panel p-6">
            <h2 className="mb-3 font-black text-slate-900">Servicios</h2>
            <div className="space-y-3">
              {barber.services.map(({ service }) => (
                <div key={service.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-slate-500">{service.description}</p>
                    )}
                    <p className="text-xs text-slate-400">{service.durationMin} min</p>
                  </div>
                  <span className="font-black text-brand-300">{formatPrice(service.price)}</span>
                </div>
              ))}
            </div>
          </div>

          {reviewsData && reviewsData.reviews.length > 0 && (
            <div className="panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black text-slate-900">Reseñas</h2>
                <StarRatingDisplay value={reviewsData.summary.average} count={reviewsData.summary.count} />
              </div>
              <div className="space-y-4">
                {reviewsData.reviews.map((r) => (
                  <div key={r.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">{r.client.name}</p>
                      <StarRatingDisplay value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-1 text-sm leading-6 text-slate-600">{r.comment}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="surface p-6 md:p-8">
            <p className="section-eyebrow">Reserva</p>
            <h2 className="panel-title mb-3 mt-2 !text-3xl">Elige tu hora</h2>
            <p className="mb-6 text-sm text-slate-500">Elige servicio, fecha y horario. Al confirmar solo te pediremos tus datos de contacto.</p>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                1. Elige un servicio
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {barber.services.map(({ service }) => (
                  <button
                    aria-pressed={selectedServiceId === service.id}
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedServiceId === service.id
                        ? 'border-brand-500 bg-brand-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-black text-slate-800">{service.name}</p>
                    <p className="text-sm text-slate-500">{service.durationMin} min · {formatPrice(service.price)}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="booking-date" className="mb-2 block text-sm font-bold text-slate-700">
                2. Elige una fecha
              </label>
              <input
                id="booking-date"
                type="date"
                value={selectedDate}
                min={shopDate()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field max-w-xs"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                3. Elige un horario disponible
              </label>

              {/* Requiere haber seleccionado servicio primero */}
              {!selectedServiceId && (
                <p className="py-3 text-sm text-slate-400">
                  Selecciona un servicio en el paso 1 para ver los horarios disponibles.
                </p>
              )}

              {selectedServiceId && loadingSlots && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              )}

              {selectedServiceId && !loadingSlots && slotsError && (
                <p className="py-3 text-sm text-red-500">
                  No se pudieron cargar los horarios. Intenta recargar la página.
                </p>
              )}

              {selectedServiceId && !loadingSlots && !slotsError && slots?.length === 0 && (
                <p className="py-3 text-sm text-slate-400">
                  No hay horarios disponibles para esta fecha. Prueba con otro día.
                </p>
              )}

              {selectedServiceId && !loadingSlots && !slotsError && slots && slots.length > 0 && (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot) => {
                        const to = `/booking?barberId=${id}&serviceId=${selectedServiceId}&startAt=${encodeURIComponent(slot.startAt)}`;
                        return (
                          <Link
                            key={slot.startAt}
                            to={to}
                            className="slot-link rounded-lg border border-brand-200 bg-white py-2 text-center text-sm font-bold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50"
                          >
                            {slot.startTime}
                          </Link>
                        );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {!!portfolio?.length && (
            <section className="surface p-6 md:p-8" aria-labelledby="portfolio-title">
              <p className="section-eyebrow">Portafolio</p>
              <h2 id="portfolio-title" className="panel-title mb-5 mt-2 !text-3xl">Sus trabajos</h2>
              <PortfolioGallery
                items={portfolio.map((p) => ({
                  id: p.id,
                  src: p.imageUrl,
                  alt: p.caption ? `Trabajo: ${p.caption}` : `Trabajo de ${barber.user.name}`,
                  caption: p.caption,
                }))}
              />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
