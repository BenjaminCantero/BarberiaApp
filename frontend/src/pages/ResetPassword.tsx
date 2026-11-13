import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { getApiErrorMessage } from '../lib/errors';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setStatus('error');
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    setStatus('loading');
    try {
      await authApi.resetPassword(token, form.password);
      navigate('/login?reset=1');
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
        <h1 className="text-3xl font-black text-slate-950">Nueva contraseña</h1>
        <p className="mb-8 mt-2 text-slate-500">Elegí una contraseña segura para tu cuenta.</p>

        {!token ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            El enlace no es válido. Solicitá uno nuevo desde{' '}
            <Link to="/forgot-password" className="font-bold underline">
              recuperar contraseña
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">Contraseña</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field"
                placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">Repetir contraseña</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className="input-field"
                placeholder="********"
              />
            </div>

            {status === 'error' && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</p>
            )}

            <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
              {status === 'loading' ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
