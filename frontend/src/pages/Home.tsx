import { Link } from 'react-router-dom';
import { AppNavbar } from '../components/AppNavbar';
import { HeroLogo } from '../components/HeroLogo';
import { PortfolioGallery, STUDIO_FALLBACK, type GalleryItem } from '../components/PortfolioGallery';
import { useBarbers } from '../hooks/useBarbers';
import { usePublicPortfolio } from '../hooks/usePortfolio';
import { formatPrice } from '../lib/format';
import { InstagramIcon } from '../components/InstagramIcon';

const INSTAGRAM_URL = 'https://www.instagram.com/dragonstudio.cl/';
const WHATSAPP_URL = 'https://wa.me/56982984323';
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Soto+mayor+426+Nueva+Imperial';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function Home() {
  const { data: barbers, isLoading, isError, refetch } = useBarbers();
  const { data: photos } = usePublicPortfolio(12);

  const services = [
    ...new Map(
      barbers?.flatMap((barber) =>
        barber.services.map(({ service }) => [service.id, { ...service, barberId: barber.id }] as const),
      ),
    ).values(),
  ];

  const gallery: GalleryItem[] = photos?.length
    ? photos.map((p) => ({
        id: p.id,
        src: p.imageUrl,
        alt: p.caption ? `Trabajo: ${p.caption}` : `Trabajo de ${p.barber?.user.name ?? 'Dragon Studio'}`,
        caption: p.caption,
        barber: p.barber ? { id: p.barber.id, name: p.barber.user.name } : undefined,
      }))
    : STUDIO_FALLBACK;
  const usingFallback = !photos?.length;

  return (
    <div className="app-shell dragon-home">
      <AppNavbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="hero speed-lines">
          <div className="hero-inner">
            <HeroLogo />
            <h1>Tu estilo. Nuestro oficio.</h1>
            <p className="hero-copy">
              Fades limpios, diseños a mano y barba bien perfilada. Elige tu servicio, toma tu hora y deja el resto al
              equipo.
            </p>
            <div className="hero-ctas">
              <a href="#servicios" className="btn-primary">Reservar mi hora <span aria-hidden="true">↗</span></a>
              <a href="#trabajos" className="btn-secondary">Ver trabajos</a>
            </div>
            <span className="hero-note">Sin crear cuenta · Recordatorio por correo</span>
            <div className="hero-facts">
              <span>Soto Mayor 426, Nueva Imperial</span>
              <a href="tel:+56982984323">+56 9 8298 4323</a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp ↗</a>
            </div>
          </div>
        </section>

        <div className="home-wrap">
          {/* ── Trabajos ───────────────────────────────────────────────────── */}
          <section id="trabajos" className="home-section">
            <div className="section-head">
              <div>
                <p className="section-eyebrow">Galería</p>
                <h2>Trabajos del estudio</h2>
              </div>
              <a className="text-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
                Más en Instagram @dragonstudio.cl ↗
              </a>
            </div>
            <PortfolioGallery items={gallery} showBarber={!usingFallback} max={12} />
            {usingFallback && <p className="gallery-note">Fotos del Instagram del estudio. Pronto, los trabajos de cada barbero.</p>}
          </section>

          {/* ── Servicios + tarjeta del estudio ────────────────────────────── */}
          <div className="home-grid home-section">
            <section id="servicios">
              <div className="section-head">
                <div>
                  <p className="section-eyebrow">Paso 1</p>
                  <h2>Elige tu servicio</h2>
                </div>
                <p>Después eliges barbero y horario.</p>
              </div>

              {isLoading && <p role="status" className="text-slate-500">Cargando servicios…</p>}
              {isError && (
                <div role="alert" className="panel p-6">
                  <p>No pudimos cargar los servicios.</p>
                  <button className="btn-secondary mt-4" onClick={() => refetch()}>Volver a intentar</button>
                </div>
              )}
              {!isLoading && !isError && services.length === 0 && (
                <p className="panel p-6">Estamos preparando la agenda. Escríbenos por WhatsApp para coordinar tu hora.</p>
              )}

              <div className="service-list">
                {services.map((service, i) => (
                  <Link
                    className="service-row"
                    key={service.id}
                    to={`/barbers/${service.barberId}?serviceId=${encodeURIComponent(service.id)}`}
                  >
                    <span className="service-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{service.name}</h3>
                      <p>{service.durationMin} min{service.description ? ` · ${service.description}` : ''}</p>
                    </div>
                    <strong>{formatPrice(service.price)}</strong>
                    <span className="arrow" aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            </section>

            <aside className="shop-card">
              <img src="/brand/dragon-logo.webp" width="96" height="96" alt="Logo de Dragon Studio" />
              <h2>Dragon Studio</h2>
              <p>Servicio de barbería premium privado.</p>
              <a className="btn-primary" href="#servicios">Elegir servicio</a>
              <dl>
                <div><dt>Dónde</dt><dd>Soto Mayor 426<br />Nueva Imperial, Chile</dd></div>
                <div><dt>Contacto</dt><dd><a href="tel:+56982984323">+56 9 8298 4323</a></dd></div>
                <div><dt>Reserva</dt><dd>Servicio, horario y listo. Solo pedimos nombre y correo.</dd></div>
              </dl>
              <div className="shop-links">
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Escríbenos por WhatsApp ↗</a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram ↗</a>
              </div>
            </aside>
          </div>

          {/* ── Equipo ─────────────────────────────────────────────────────── */}
          {!!barbers?.length && (
            <section className="home-section">
              <div className="section-head">
                <div>
                  <p className="section-eyebrow">El equipo</p>
                  <h2>Elige quién te atiende</h2>
                </div>
                <Link className="text-link" to="/barbers">Ver todos ↗</Link>
              </div>
              <div className="team-grid">
                {barbers.map((barber) => (
                  <Link to={`/barbers/${barber.id}`} className="team-card" key={barber.id}>
                    {barber.user.avatarUrl ? (
                      <img src={barber.user.avatarUrl} alt="" width="72" height="72" />
                    ) : (
                      <span className="team-initials" aria-hidden="true">{initials(barber.user.name)}</span>
                    )}
                    <div>
                      <h3>{barber.user.name}</h3>
                      {barber.instagram && (
                        <span className="team-ig"><InstagramIcon size={13} /> @{barber.instagram}</span>
                      )}
                    </div>
                    <p>{barber.bio || 'Revisa sus trabajos y encuentra tu hora.'}</p>
                    <span className="go">Ver trabajos y reservar ↗</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Sobre el estudio ───────────────────────────────────────────── */}
          <section className="about home-section">
            <div className="about-media">
              <img src="/brand/galeria/barbero-trabajando.webp" alt="Barbero trabajando en el estudio" loading="lazy" width="817" height="872" />
              <img src="/brand/galeria/maquina-anime.webp" alt="Máquina personalizada con diseño de anime" loading="lazy" width="817" height="872" />
            </div>
            <div>
              <p className="section-eyebrow">El estudio</p>
              <h2 className="mt-3">El detalle hace<br />la diferencia.</h2>
              <p>
                Luces hexagonales, pósters de anime en la pared y un equipo dedicado al corte, la barba y a encontrar tu
                estilo. Reserva tu hora, ven al estudio y deja el resto en nuestras manos.
              </p>
              <a className="btn-secondary" href={MAPS_URL} target="_blank" rel="noreferrer">Cómo llegar ↗</a>
            </div>
          </section>
        </div>

        <section className="final-cta">
          <div className="final-cta-inner">
            <h2>Tu próxima hora<br />empieza aquí.</h2>
            <a href="#servicios" className="btn-primary">Reservar hora ↗</a>
          </div>
        </section>
      </main>

      <footer className="dragon-footer">
        <Link to="/" className="brand-mark">Dragon Studio</Link>
        <nav aria-label="Pie de página">
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram</a>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp</a>
          <Link to="/barbers">Barberos</Link>
          <Link to="/login">Acceso del equipo</Link>
        </nav>
        <span>Soto Mayor 426 · Nueva Imperial, Chile</span>
      </footer>
    </div>
  );
}
