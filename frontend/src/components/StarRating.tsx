import { useState } from 'react';

interface DisplayProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
}

/** Muestra un rating en estrellas (con medias) y, opcionalmente, la cantidad. */
export function StarRatingDisplay({ value, count, size = 'sm' }: DisplayProps) {
  const cls = size === 'md' ? 'text-lg' : 'text-sm';
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-1 ${cls}`} title={`${value} de 5`}>
      <span className="text-amber-400" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => {
          if (rounded >= i) return <span key={i}>★</span>;
          if (rounded >= i - 0.5) return <span key={i}>⯨</span>;
          return <span key={i} className="text-slate-300">★</span>;
        })}
      </span>
      {value > 0 && <span className="font-bold text-slate-700">{value.toFixed(1)}</span>}
      {typeof count === 'number' && (
        <span className="text-slate-400">({count})</span>
      )}
    </span>
  );
}

interface InputProps {
  value: number;
  onChange: (value: number) => void;
}

/** Selector interactivo de estrellas (1..5). */
export function StarRatingInput({ value, onChange }: InputProps) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition ${(hover || value) >= i ? 'text-amber-400' : 'text-slate-300'}`}
          aria-label={`${i} estrella${i > 1 ? 's' : ''}`}
          aria-checked={value === i}
          role="radio"
        >
          ★
        </button>
      ))}
    </div>
  );
}
