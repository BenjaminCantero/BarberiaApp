import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLogin } from '../hooks/useAuth';

export function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? undefined;
  const login = useLogin(redirect);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(form);
  };

  return (
    <div className="app-shell grid min-h-screen place-items-center p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl shadow-slate-950/15 md:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden bg-slate-950 p-8 text-white md:flex md:flex-col md:justify-between">
          <Link to="/" className="brand-mark text-white">
            <span className="brand-icon">BB</span>
            <span>BarberBook</span>
          </Link>
          <div>
            <p className="section-eyebrow text-brand-300">Bienvenido de vuelta</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">Tu próxima cita está a un paso.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Ingresa para revisar reservas, confirmar horarios y volver a agendar con tus barberos favoritos.
            </p>
          </div>
        </aside>

        <section className="p-6 sm:p-8 md:p-10">
          <Link to="/" className="brand-mark mb-8 md:hidden">
            <span className="brand-icon">BB</span>
            <span>BarberBook</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-950">Iniciar sesión</h1>
          <p className="mb-8 mt-2 text-slate-500">Bienvenido de vuelta a BarberBook</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Contraseña</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
              placeholder="********"
            />
          </div>

          {login.error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">Credenciales inválidas. Intenta nuevamente.</p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="btn-primary w-full"
          >
            {login.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-bold text-brand-700 hover:underline">
            Regístrate
          </Link>
        </p>
        </section>
      </div>
    </div>
  );
}
