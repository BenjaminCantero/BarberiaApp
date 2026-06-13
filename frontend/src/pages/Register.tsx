import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useRegister } from '../hooks/useAuth';

export function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? undefined;
  const register = useRegister(redirect);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(form);
  };

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-slate-700">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="input-field"
        placeholder={placeholder}
        required={key !== 'phone'}
      />
    </div>
  );

  return (
    <div className="app-shell grid min-h-screen place-items-center p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl shadow-slate-950/15 md:grid-cols-[1.05fr_0.95fr]">
        <section className="p-6 sm:p-8 md:p-10">
          <Link to="/" className="brand-mark mb-8">
            <span className="brand-icon">BB</span>
            <span>BarberBook</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-950">Crear cuenta</h1>
          <p className="mb-8 mt-2 text-slate-500">Únete a BarberBook y reserva tu cita</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {field('Nombre completo', 'name', 'text', 'Juan García')}
          {field('Email', 'email', 'email', 'tu@email.com')}
          {field('Teléfono (opcional)', 'phone', 'tel', '+34 612 345 678')}
          {field('Contraseña', 'password', 'password', 'Mín. 8 caracteres, 1 mayúscula, 1 número')}

          {register.isSuccess && (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Cuenta creada. Ahora puedes iniciar sesión.</p>
          )}
          {register.isError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">Error al registrarse. El email puede estar en uso.</p>
          )}

          <button
            type="submit"
            disabled={register.isPending}
            className="btn-primary w-full"
          >
            {register.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-bold text-brand-700 hover:underline">
            Inicia sesión
          </Link>
        </p>
        </section>

        <aside className="hidden bg-slate-950 p-8 text-white md:flex md:flex-col md:justify-between">
          <div className="rounded-lg border border-white/10 bg-white/10 p-5">
            <p className="text-sm font-bold text-brand-300">Reserva clara</p>
            <p className="mt-2 text-3xl font-black">Servicio, precio y hora antes de confirmar.</p>
          </div>
          <div>
            <p className="section-eyebrow text-brand-300">Empieza hoy</p>
            <h2 className="mt-3 text-4xl font-black leading-tight">Tu agenda de barbería, simple y elegante.</h2>
          </div>
        </aside>
      </div>
    </div>
  );
}
