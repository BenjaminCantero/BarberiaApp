import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/useAuth';

export function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const register = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(form);
  };

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        placeholder={placeholder}
        required={key !== 'phone'}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
        <p className="text-gray-500 mb-6">Únete a BarberBook y reserva tu cita</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('Nombre completo', 'name', 'text', 'Juan García')}
          {field('Email', 'email', 'email', 'tu@email.com')}
          {field('Teléfono (opcional)', 'phone', 'tel', '+34 612 345 678')}
          {field('Contraseña', 'password', 'password', 'Mín. 8 caracteres, 1 mayúscula, 1 número')}

          {register.isSuccess && (
            <p className="text-green-600 text-sm">Cuenta creada. Ahora puedes iniciar sesión.</p>
          )}
          {register.isError && (
            <p className="text-red-600 text-sm">Error al registrarse. El email puede estar en uso.</p>
          )}

          <button
            type="submit"
            disabled={register.isPending}
            className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {register.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
