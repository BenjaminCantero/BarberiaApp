import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLogin } from '../hooks/useAuth';

export function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? undefined;
  const justReset = searchParams.get('reset') === '1';
  const login = useLogin(redirect);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(form);
  };

  return (
    <div className="app-shell grid min-h-screen place-items-center p-4">
      <div className="auth-card grid w-full max-w-5xl md:grid-cols-[0.95fr_1.05fr]">
        <aside className="auth-art hidden p-8 text-white md:flex md:flex-col md:justify-between">
          <Link to="/" className="brand-mark text-white">
            <span className="brand-icon">DS</span>
            <span>Dragon Studio</span>
          </Link>
          <div>
            <h2 className="text-5xl">El estudio,<br />en orden.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Gestiona tu agenda, confirma las reservas y prepara el día en Dragon Studio. Si vienes por un corte, puedes reservar sin iniciar sesión.
            </p>
          </div>
        </aside>

        <section className="p-6 sm:p-8 md:p-10">
          <Link to="/" className="brand-mark mb-8 md:hidden">
            <span className="brand-icon">DS</span>
            <span>Dragon Studio</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-950">Iniciar sesión</h1>
          <p className="mb-8 mt-2 text-slate-500">Bienvenido de vuelta a Dragon Studio</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-bold text-slate-700">Correo electrónico</label>
            <input
              id="login-email"
              autoComplete="username"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="block text-sm font-bold text-slate-700">Contraseña</label>
              <Link to="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">
                ¿La olvidaste?
              </Link>
            </div>
            <input
              id="login-password"
              autoComplete="current-password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
              placeholder="********"
            />
          </div>

          {justReset && (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Tu contraseña se actualizó. Iniciá sesión con la nueva.
            </p>
          )}

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
