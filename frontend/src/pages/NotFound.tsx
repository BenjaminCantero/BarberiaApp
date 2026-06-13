import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <p className="text-8xl font-black text-slate-200">404</p>
        <h1 className="mt-4 text-2xl font-black text-slate-900">Página no encontrada</h1>
        <p className="mt-2 text-slate-500">La URL que buscas no existe o fue movida.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="btn-primary px-6">Ir al inicio</Link>
          <Link to="/barbers" className="btn-secondary px-6">Ver barberos</Link>
        </div>
      </div>
    </div>
  );
}
