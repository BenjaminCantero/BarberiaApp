import { Link } from 'react-router-dom';

const FEATURES = [
  { label: 'Barberos expertos', value: '12+', desc: 'Especialistas en cortes, barba y estilo clásico.' },
  { label: 'Reserva rápida', value: '2 min', desc: 'Agendas tu hora sin esperas ni llamadas.' },
  { label: 'Estilo premium', value: '100%', desc: 'Atención personalizada en un ambiente exclusivo.' },
];

const STEPS = [
  { step: '01', title: 'Elige tu barbero', desc: 'Revisa perfiles con estilos y especialidades claras.' },
  { step: '02', title: 'Confirma tu horario', desc: 'Selecciona servicio, precio y fecha en segundos.' },
  { step: '03', title: 'Disfruta el corte', desc: 'Llega a Dragon Studio y deja que tu estilo hable por ti.' },
];

export function Home() {
  return (
    <div className="app-shell-dark">
      <nav className="app-nav app-nav-dark flex items-center justify-between">
        <Link to="/" className="brand-mark text-white">
          <span className="brand-icon">DS</span>
          <span>Dragon Studio</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/barbers" className="hidden text-sm font-semibold text-slate-200 transition hover:text-white sm:inline">
            Barberos
          </Link>
          <Link to="/login" className="btn-secondary min-h-10 border-white/20 bg-white/10 px-4 text-white hover:bg-white/20">
            Entrar
          </Link>
          <Link to="/register" className="btn-brand min-h-10 px-4">
            Reservar
          </Link>
        </div>
      </nav>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:px-8 lg:py-16">
          <div className="max-w-3xl">
            <p className="section-eyebrow text-brand-300">Dragon Studio</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
              La barbería que lleva tu estilo al siguiente nivel.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              Reserva tu corte, barba o diseño de cejas con barberos expertos y atención premium en un solo lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/barbers" className="btn-brand px-7">
                Ver barberos
              </Link>
              <Link to="/register" className="btn-secondary border-white/20 bg-white/10 px-7 text-white hover:bg-white/20">
                Reservar ahora
              </Link>
            </div>
          </div>

          <div className="surface border-white/20 bg-slate-950/50 p-4 text-white">
            <div className="overflow-hidden rounded-lg">
              <img
                src="https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=900&q=80"
                alt="Barbero preparando un corte en una barbería moderna"
                className="h-64 w-full object-cover sm:h-80 lg:h-[25rem]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4">
              {FEATURES.map((item) => (
                <div key={item.label} className="rounded-lg border border-white/10 bg-white/10 p-3">
                  <p className="text-2xl font-black text-brand-300">{item.value}</p>
                  <p className="mt-1 text-xs font-bold text-white">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 text-slate-900">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[0.8fr_1.2fr] md:px-8">
            <div>
              <p className="section-eyebrow">Cómo funciona</p>
              <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-4xl">De la idea al sillón en tres pasos.</h2>
              <p className="mt-4 text-slate-600">
                Dragon Studio mantiene la reserva simple para clientes y ordenada para cada barbero.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {STEPS.map((item) => (
                <article key={item.step} className="panel p-5">
                  <span className="chip">{item.step}</span>
                  <h3 className="mt-4 text-lg font-black text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-14 md:grid-cols-3 md:px-8">
            {FEATURES.map((item) => (
              <article key={item.desc} className="panel p-6">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">{item.label}</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
