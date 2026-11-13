import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from './ConfirmDialog';
import { useMyPortfolio, useUploadPortfolioPhoto, useDeletePortfolioPhoto } from '../hooks/usePortfolio';
import { getApiErrorMessage } from '../lib/errors';
import type { PortfolioStatus } from '../api/portfolio.api';
import { compressImage } from '../lib/compressImage';

// Se acepta una foto grande del celular: se comprime en el navegador antes de subir.
const MAX_MB = 25;
const SERVER_MAX_MB = 4;
const STATUS_LABEL: Record<PortfolioStatus, string> = {
  PENDING: 'En revisión',
  APPROVED: 'Publicada',
  REJECTED: 'Rechazada',
};

/** Pestaña del panel del barbero: subir y gestionar fotos de su trabajo. */
export function PortfolioManager({ barberId }: { barberId: string }) {
  const { data: photos, isLoading } = useMyPortfolio(barberId);
  const upload = useUploadPortfolioPhoto(barberId);
  const remove = useDeletePortfolioPhoto(barberId);

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const [preparing, setPreparing] = useState(false);

  const onPick = async (f: File | null) => {
    if (!f) return setFile(null);
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`La imagen supera ${MAX_MB} MB`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setPreparing(true);
    try {
      const ready = await compressImage(f);
      if (ready.size > SERVER_MAX_MB * 1024 * 1024) {
        toast.error('La imagen sigue siendo muy pesada. Prueba con otra foto.');
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      setFile(ready);
    } finally {
      setPreparing(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      await upload.mutateAsync({ file, caption: caption.trim() || undefined });
      setFile(null);
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Foto enviada. Se publicará cuando el admin la apruebe.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo subir la foto'));
    }
  };

  const counts = {
    APPROVED: photos?.filter((p) => p.status === 'APPROVED').length ?? 0,
    PENDING: photos?.filter((p) => p.status === 'PENDING').length ?? 0,
  };

  return (
    <div className="space-y-6">
      <form className="panel portfolio-upload" onSubmit={onSubmit}>
        <div>
          <p className="section-eyebrow">Tu portafolio</p>
          <h2 className="panel-title">Sube un trabajo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Fotos claras del corte terminado. El admin las revisa antes de mostrarlas en la web.
            Si sale la cara del cliente, pídele permiso primero.
          </p>
        </div>

        <label className={`dropzone${preview ? ' has-preview' : ''}`}>
          {preview ? (
            <img src={preview} alt="Vista previa de la foto a subir" />
          ) : (
            <span>
              <strong>Elegir foto</strong>
              <small>{preparing ? 'Preparando foto…' : `JPG, PNG o WebP · se optimiza al subir`}</small>
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>

        <div>
          <label htmlFor="portfolio-caption" className="field-label">Descripción (opcional)</label>
          <input
            id="portfolio-caption"
            className="input-field"
            maxLength={120}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ej: Low fade con diseño"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={!file || preparing || upload.isPending}>
            {upload.isPending ? 'Subiendo…' : 'Enviar a revisión'}
          </button>
          {file && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
            >
              Quitar
            </button>
          )}
        </div>
      </form>

      <section className="panel p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="panel-title">Mis fotos ({photos?.length ?? 0}/30)</h2>
          <span className="text-xs text-slate-500">{counts.APPROVED} publicadas · {counts.PENDING} en revisión</span>
        </div>

        {isLoading && <p className="text-sm text-slate-500" role="status">Cargando…</p>}
        {!isLoading && !photos?.length && (
          <p className="text-sm text-slate-500">Todavía no subes fotos. Tu primer trabajo puede estar en la portada.</p>
        )}

        {!!photos?.length && (
          <ul className="portfolio-admin-grid" role="list">
            {photos.map((p) => (
              <li key={p.id} className="portfolio-admin-item">
                <img src={p.imageUrl} alt={p.caption ?? 'Trabajo del portafolio'} loading="lazy" />
                <span className={`status-pill status-${p.status.toLowerCase()}`}>{STATUS_LABEL[p.status]}</span>
                <div className="portfolio-admin-meta">
                  <span className="truncate">{p.caption ?? 'Sin descripción'}</span>
                  <button type="button" className="link-danger" onClick={() => setToDelete(p.id)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar foto"
        message="La foto se borra del portafolio y de la web. No se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete, {
            onSuccess: () => { setToDelete(null); toast.success('Foto eliminada'); },
            onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo eliminar')),
          })
        }
      />
    </div>
  );
}
