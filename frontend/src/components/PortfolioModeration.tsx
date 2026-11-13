import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from './ConfirmDialog';
import {
  usePortfolioReviewQueue,
  useReviewPortfolioPhoto,
  useAdminDeletePortfolioPhoto,
} from '../hooks/usePortfolio';
import { getApiErrorMessage } from '../lib/errors';
import type { PortfolioPhoto, PortfolioStatus } from '../api/portfolio.api';

const FILTERS: { id: PortfolioStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'APPROVED', label: 'Publicadas' },
  { id: 'REJECTED', label: 'Rechazadas' },
];

/** Panel admin: aprobar o rechazar las fotos que suben los barberos. */
export function PortfolioModeration() {
  const [filter, setFilter] = useState<PortfolioStatus>('PENDING');
  const { data: photos, isLoading, isError, refetch } = usePortfolioReviewQueue(filter);
  const review = useReviewPortfolioPhoto();
  const remove = useAdminDeletePortfolioPhoto();
  const [toDelete, setToDelete] = useState<PortfolioPhoto | null>(null);

  const decide = (photoId: string, status: 'APPROVED' | 'REJECTED') =>
    review.mutate(
      { photoId, status },
      {
        onSuccess: () => toast.success(status === 'APPROVED' ? 'Foto publicada' : 'Foto rechazada'),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow">Galería</p>
          <h2 className="panel-title">Fotos de trabajos</h2>
          <p className="mt-1 text-sm text-slate-500">Solo las publicadas aparecen en la portada y en el perfil del barbero.</p>
        </div>
        <div className="seg" role="tablist" aria-label="Filtrar por estado">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={filter === f.id ? 'is-active' : ''}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-slate-500" role="status">Cargando…</p>}
      {isError && (
        <div role="alert" className="panel p-6">
          <p className="text-red-600">No se pudieron cargar las fotos.</p>
          <button className="btn-secondary mt-3" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}
      {!isLoading && !isError && !photos?.length && (
        <div className="panel p-8 text-center text-sm text-slate-500">
          {filter === 'PENDING' ? 'Nada por revisar. ✓' : 'No hay fotos en esta lista.'}
        </div>
      )}

      {!!photos?.length && (
        <ul className="portfolio-admin-grid" role="list">
          {photos.map((p) => (
            <li key={p.id} className="portfolio-admin-item">
              <a href={p.imageUrl} target="_blank" rel="noreferrer" aria-label="Abrir foto en tamaño completo">
                <img src={p.imageUrl} alt={p.caption ?? 'Foto de trabajo'} loading="lazy" />
              </a>
              <div className="portfolio-admin-meta flex-col !items-start">
                <strong className="text-sm">{p.barber?.user.name ?? 'Barbero'}</strong>
                <span className="text-xs text-slate-500">
                  {p.caption ?? 'Sin descripción'} · {new Date(p.createdAt).toLocaleDateString('es-CL')}
                </span>
              </div>
              <div className="portfolio-admin-actions">
                {p.status !== 'APPROVED' && (
                  <button className="btn-primary btn-sm" disabled={review.isPending} onClick={() => decide(p.id, 'APPROVED')}>
                    Aprobar
                  </button>
                )}
                {p.status !== 'REJECTED' && (
                  <button className="btn-secondary btn-sm" disabled={review.isPending} onClick={() => decide(p.id, 'REJECTED')}>
                    {p.status === 'APPROVED' ? 'Despublicar' : 'Rechazar'}
                  </button>
                )}
                <button className="link-danger" onClick={() => setToDelete(p)}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar foto"
        message="Se borra la foto del portafolio del barbero. No se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          remove.mutate(
            { barberId: toDelete.barberId, photoId: toDelete.id },
            {
              onSuccess: () => { setToDelete(null); toast.success('Foto eliminada'); },
              onError: (err) => toast.error(getApiErrorMessage(err)),
            },
          )
        }
      />
    </section>
  );
}
