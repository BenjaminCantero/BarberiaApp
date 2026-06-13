import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useProfile, useUpdateProfile, useChangePassword } from '../hooks/useProfile';
import { AppNavbar } from '../components/AppNavbar';

export function ProfilePage() {
  const { user } = useAuthStore();
  const { data: profile, isLoading } = useProfile();

  const updateProfile = useUpdateProfile();
  const changePwd = useChangePassword();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Pre-fill form when data loads
  const initialized = name !== '' || phone !== '';
  if (profile && !initialized) {
    setName(profile.name);
    setPhone(profile.phone ?? '');
  }

  const dashboardLink =
    user?.role === 'CLIENT'
      ? '/dashboard/client'
      : user?.role === 'BARBER'
        ? '/dashboard/barber'
        : '/dashboard/admin';

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await updateProfile.mutateAsync({ name: name.trim(), phone: phone.trim() || null });
      setProfileMsg({ ok: true, text: 'Perfil actualizado correctamente.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setProfileMsg({ ok: false, text: msg ?? 'Error al actualizar el perfil.' });
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    try {
      await changePwd.mutateAsync({ currentPassword, newPassword });
      setPwdMsg({ ok: true, text: 'Contraseña actualizada correctamente.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwdMsg({ ok: false, text: msg ?? 'Error al cambiar la contraseña.' });
    }
  };

  return (
    <div className="app-shell">
      <AppNavbar back={{ label: 'Mi panel', to: dashboardLink }} />

      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="section-eyebrow">Cuenta</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">Mi perfil</h1>
        <p className="mt-1 text-sm text-slate-500">
          Actualiza tu información personal y contraseña.
        </p>

        {isLoading ? (
          <div className="mt-12 text-center text-slate-400">Cargando...</div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Información personal */}
            <form onSubmit={handleProfileSave} className="panel p-6 space-y-4">
              <h2 className="font-black text-slate-900">Información personal</h2>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Nombre completo
                </label>
                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Email
                </label>
                <input
                  className="input-field bg-slate-50 cursor-not-allowed"
                  value={profile?.email ?? ''}
                  readOnly
                  disabled
                />
                <p className="mt-1 text-xs text-slate-400">El email no se puede cambiar.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Teléfono (opcional)
                </label>
                <input
                  className="input-field"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                  placeholder="+34 612 345 678"
                />
              </div>

              {profileMsg && (
                <p
                  className={`text-sm font-medium ${profileMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {profileMsg.text}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary px-6"
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>

            {/* Cambio de contraseña */}
            <form onSubmit={handlePasswordSave} className="panel p-6 space-y-4">
              <h2 className="font-black text-slate-900">Cambiar contraseña</h2>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Contraseña actual
                </label>
                <input
                  className="input-field"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Nueva contraseña
                </label>
                <input
                  className="input-field"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Mínimo 8 caracteres, con mayúscula, minúscula y número.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Confirmar nueva contraseña
                </label>
                <input
                  className="input-field"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {pwdMsg && (
                <p
                  className={`text-sm font-medium ${pwdMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {pwdMsg.text}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary px-6"
                disabled={changePwd.isPending}
              >
                {changePwd.isPending ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </form>

            <div className="text-center">
              <Link to={dashboardLink} className="text-sm font-medium text-brand-600 hover:underline">
                ← Volver a mi panel
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
