import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Barber } from '../api/barber.api';
import { useUpdateBarber } from '../hooks/useBarbers';
import { getApiErrorMessage } from '../lib/errors';

const BIO_MAX = 500;

/** Pestaña del panel del barbero: bio e Instagram que se muestran en su perfil público. */
export function BarberProfileForm({ barber }: { barber: Barber }) {
  const update = useUpdateBarber(barber.id);
  const [bio, setBio] = useState(barber.bio ?? '');
  const [instagram, setInstagram] = useState(barber.instagram ? `@${barber.instagram}` : '');

  useEffect(() => {
    setBio(barber.bio ?? '');
    setInstagram(barber.instagram ? `@${barber.instagram}` : '');
  }, [barber.bio, barber.instagram]);

  const dirty = bio !== (barber.bio ?? '') || instagram !== (barber.instagram ? `@${barber.instagram}` : '');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      { bio, instagram },
      {
        onSuccess: (saved) => {
          // Mostrar lo que quedó guardado (p. ej. una URL pegada pasa a "@usuario").
          setBio(saved.bio ?? '');
          setInstagram(saved.instagram ? `@${saved.instagram}` : '');
          toast.success('Perfil público actualizado');
        },
        onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo guardar')),
      },
    );
  };

  return (
    <form className="panel space-y-5 p-6" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow">Perfil público</p>
          <h2 className="panel-title mt-1">Cómo te ven los clientes</h2>
        </div>
        <Link to={`/barbers/${barber.id}`} className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-900">
          Ver mi perfil ↗
        </Link>
      </div>

      <div>
        <label htmlFor="barber-bio" className="field-label">Bio</label>
        <textarea
          id="barber-bio"
          className="input-field min-h-[110px] resize-y"
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Ej: Barbero colorista. Compite por calidad, no por precio."
        />
        <p className="mt-1 text-right text-xs text-slate-500">{bio.length}/{BIO_MAX}</p>
      </div>

      <div>
        <label htmlFor="barber-instagram" className="field-label">Instagram</label>
        <input
          id="barber-instagram"
          className="input-field max-w-sm"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@tu.usuario"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-slate-500">Tu usuario o el enlace a tu perfil. Déjalo vacío para no mostrarlo.</p>
      </div>

      <button type="submit" className="btn-primary" disabled={!dirty || update.isPending}>
        {update.isPending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
