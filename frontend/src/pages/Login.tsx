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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Iniciar sesión</h1>
        <p className="text-gray-500 mb-6">Bienvenido de vuelta a BarberBook</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
            />
          </div>

          {login.error && (
            <p className="text-red-600 text-sm">Credenciales inválidas. Intenta nuevamente.</p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {login.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
