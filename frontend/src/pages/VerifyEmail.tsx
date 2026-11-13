import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { getApiErrorMessage } from '../lib/errors';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const done = useRef(false);

  useEffect(() => {
    // Evita la doble ejecución del efecto en StrictMode (dev).
    if (done.current) return;
    done.current = true;

    if (!token) {
      setStatus('error');
      setMessage('El enlace no es válido.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(({ data }) => {
        setMessage(data.message);
        setStatus('success');
      })
      .catch((err) => {
        setMessage(getApiErrorMessage(err));
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="app-shell grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md auth-card p-6 text-center sm:p-8">
        <Link to="/" className="brand-mark mb-8 justify-center">
          <span className="brand-icon">DS</span>
          <span>Dragon Studio</span>
        </Link>

        {status === 'loading' && <p className="text-slate-500">Verificando tu email...</p>}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-black text-slate-950">¡Email verificado!</h1>
            <p className="text-slate-500">{message}</p>
            <Link to="/login" className="btn-primary block w-full text-center">
              Iniciar sesión
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-2xl font-black text-slate-950">No pudimos verificar</h1>
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</p>
            <Link to="/login" className="btn-primary block w-full text-center">
              Volver
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
