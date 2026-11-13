import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  caption?: string | null;
  barber?: { id: string; name: string };
}

/** Fotos del estudio usadas mientras no haya trabajos aprobados. */
export const STUDIO_FALLBACK: GalleryItem[] = [
  { id: 'f1', src: '/brand/galeria/low-fade.webp', alt: 'Low fade con flequillo texturizado', caption: 'Low fade' },
  { id: 'f2', src: '/brand/galeria/fade-maquina.webp', alt: 'Barbero marcando un degradado con máquina', caption: 'En proceso' },
  { id: 'f3', src: '/brand/galeria/taper-fade.webp', alt: 'Taper fade con textura arriba', caption: 'Taper fade' },
  { id: 'f4', src: '/brand/galeria/maquina-anime.webp', alt: 'Máquina de cortar personalizada con diseño de anime', caption: 'La herramienta' },
  { id: 'f5', src: '/brand/galeria/barbero-trabajando.webp', alt: 'Barbero trabajando en el estudio', caption: 'El estudio' },
  { id: 'f6', src: '/brand/studio.webp', alt: 'Degradado terminado en Dragon Studio', caption: 'Fade terminado' },
];

interface Props {
  items: GalleryItem[];
  /** Muestra el nombre del barbero en cada foto (galería mixta). */
  showBarber?: boolean;
  /** Cantidad máxima a mostrar en la grilla. */
  max?: number;
}

/**
 * Grilla tipo página de manga: viñetas de distinto tamaño, bordes gruesos.
 * Al hacer click abre un visor accesible (dialog nativo) con navegación por teclado.
 */
export function PortfolioGallery({ items, showBarber = false, max }: Props) {
  const visible = max ? items.slice(0, max) : items;
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + visible.length) % visible.length)),
    [visible.length],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, step]);

  if (visible.length === 0) return null;
  const current = index !== null ? visible[index] : null;

  return (
    <>
      <ul className="manga-grid" role="list">
        {visible.map((item, i) => (
          <li key={item.id} className="manga-cell">
            <button type="button" className="manga-cell-btn" onClick={() => setIndex(i)} aria-label={`Ampliar: ${item.alt}`}>
              <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
              {(item.caption || (showBarber && item.barber)) && (
                <span className="manga-caption">
                  {item.caption && <strong>{item.caption}</strong>}
                  {showBarber && item.barber && <span>por {item.barber.name}</span>}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialogRef} className="lightbox" onClose={close} onClick={(e) => e.target === dialogRef.current && close()}>
        {current && (
          <figure>
            <img src={current.src} alt={current.alt} />
            <figcaption>
              <span>
                {current.caption && <strong>{current.caption}</strong>}
                {current.barber && (
                  <Link to={`/barbers/${current.barber.id}`} onClick={close}>
                    Trabajo de {current.barber.name} ↗
                  </Link>
                )}
              </span>
              <span className="lightbox-count">{(index ?? 0) + 1} / {visible.length}</span>
            </figcaption>
            {visible.length > 1 && (
              <div className="lightbox-nav">
                <button type="button" onClick={() => step(-1)} aria-label="Foto anterior">←</button>
                <button type="button" onClick={() => step(1)} aria-label="Foto siguiente">→</button>
              </div>
            )}
            <button type="button" className="lightbox-close" onClick={close} aria-label="Cerrar">✕</button>
          </figure>
        )}
      </dialog>
    </>
  );
}
