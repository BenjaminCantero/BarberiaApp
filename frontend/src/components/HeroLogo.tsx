import { useEffect, useRef } from 'react';

/**
 * Logo del hero con el dragón animado.
 * Dos capas transparentes del mismo tamaño (texto fijo + dragón) superpuestas:
 * el dragón entra al cargar, flota en bucle con un leve brillo y sigue
 * sutilmente al puntero en escritorio. Todo se desactiva con
 * prefers-reduced-motion (ver index.css).
 */
export function HeroLogo() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduced) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        el.style.setProperty('--px', x.toFixed(3));
        el.style.setProperty('--py', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div ref={ref} className="hero-logo" role="img" aria-label="Dragon Studio">
      <img className="hero-logo-word" src="/brand/wordmark.webp" alt="" width="1030" height="375" />
      <div className="hero-dragon">
        <img src="/brand/dragon.webp" alt="" width="1030" height="375" />
      </div>
    </div>
  );
}
