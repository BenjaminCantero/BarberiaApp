import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { getApiErrorMessage } from '../lib/errors';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const { data } = await authApi.forgotPassword(email);
      setMessage(data.message);
      setStatus('sent');
    } catch (err) {
      setMessage(getApiErrorMessage(err));
      setStatus('error');
    }
  };

  return (
    <div className="app-shell grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md auth-card p-6 sm:p-8">
        <Link to="/" className="brand-mark mb-8">
          <span className="brand-icon">DS</span>
          <span>Dragon Studio</span>
        </Link>
        <h1 className="text-3xl font-black text-slate-950">Recuperar contraseña</h1>
        <p className="mb-8 mt-2 text-slate-500">
          Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
        </p>

        {status === 'sent' ? (
          <div className="space-y-6">
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>
            <Link to="/login" className="btn-primary block w-full text-center">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="tu@email.com"
              />
            </div>

            {status === 'error' && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</p>
            )}

            <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
              {status === 'loading' ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-slate-500">
          ¿La recordaste?{' '}
          <Link to="/login" className="font-bold text-brand-700 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
