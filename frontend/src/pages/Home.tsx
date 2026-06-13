import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <span className="text-2xl font-bold text-brand-400">BarberBook</span>
        <div className="flex gap-4">
          <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
            Entrar
          </Link>
          <Link
            to="/register"
            className="bg-brand-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Reservar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-col items-center justify-center text-center px-4 py-24">
        <h1 className="text-5xl font-extrabold mb-4 leading-tight">
          Tu barbería,<br />
          <span className="text-brand-400">tu horario</span>
        </h1>
        <p className="text-gray-400 text-xl max-w-xl mb-10">
          Reserva tu cita en segundos. Sin llamadas, sin esperas. Elige barbero, servicio y horario.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            to="/barbers"
            className="bg-brand-600 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            Ver barberos
          </Link>
          <Link
            to="/register"
            className="border border-gray-600 px-8 py-3 rounded-xl text-lg font-semibold hover:border-gray-400 transition-colors"
          >
            Crear cuenta
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-8 py-16 max-w-5xl mx-auto">
        {[
          { icon: '✂️', title: 'Elige tu barbero', desc: 'Consulta perfiles, especialidades y disponibilidad real.' },
          { icon: '📅', title: 'Reserva en línea', desc: 'Selecciona día y hora libre en el calendario del barbero.' },
          { icon: '🔔', title: 'Confirmación inmediata', desc: 'Recibe confirmación al instante en tu perfil.' },
        ].map((f) => (
          <div key={f.title} className="bg-gray-800 rounded-2xl p-6">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
