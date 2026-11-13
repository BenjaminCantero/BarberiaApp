import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useLogout } from '../hooks/useAuth';
import { useMyBarber } from '../hooks/useBarbers';

const ROLE_LABEL = { ADMIN: 'Administrador', BARBER: 'Barbero', CLIENT: 'Cliente' } as const;
const DASHBOARD = { ADMIN: '/dashboard/admin', BARBER: '/dashboard/barber', CLIENT: '/dashboard/client' } as const;

const LINKS = [
  { to: '/#trabajos', label: 'Trabajos' },
  { to: '/#servicios', label: 'Servicios' },
  { to: '/barbers', label: 'Barberos' },
];

function initials(name?: string) {
  return (name ?? '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/** Cierra un popover al hacer click afuera o presionar Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

export function AppNavbar() {
  const { accessToken, user } = useAuthStore();
  const logout = useLogout();
  const location = useLocation();
  const { data: myBarber } = useMyBarber(user?.role === 'BARBER');

  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useDismiss(accountOpen, () => setAccountOpen(false));
  const mobileRef = useDismiss(menuOpen, () => setMenuOpen(false));

  // Cerrar menús al navegar.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname, location.hash]);

  const loggedIn = !!accessToken && !!user;
  const accountLinks = loggedIn
    ? [
        { to: DASHBOARD[user.role], label: 'Mi panel' },
        { to: '/profile', label: 'Mi perfil' },
        ...(user.role === 'BARBER' && myBarber ? [{ to: `/barbers/${myBarber.id}`, label: 'Mi perfil público' }] : []),
      ]
    : [];

  const isActive = (to: string) =>
    to.startsWith('/#') ? location.pathname === '/' && location.hash === to.slice(1) : location.pathname.startsWith(to);

  return (
    <header className="app-nav">
      <Link to="/" className="brand-mark" aria-label="Dragon Studio, inicio">
        <img src="/brand/dragon-logo.webp" width="40" height="40" className="dragon-nav-logo" alt="" />
        <span>Dragon Studio</span>
      </Link>

      <nav className="nav-links" aria-label="Principal">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} className={isActive(l.to) ? 'is-active' : ''} aria-current={isActive(l.to) ? 'page' : undefined}>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="nav-actions">
        <Link to="/barbers" className="btn-primary btn-sm nav-cta">Reservar hora</Link>

        {loggedIn ? (
          <div className="nav-account" ref={accountRef}>
            <button
              type="button"
              className="account-trigger"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((o) => !o)}
            >
              <span className="account-avatar" aria-hidden="true">{initials(user.name)}</span>
              <span className="account-text">
                <strong>{user.name.split(' ')[0]}</strong>
                <small>{ROLE_LABEL[user.role]}</small>
              </span>
              <svg className="account-caret" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            {accountOpen && (
              <div className="account-menu" role="menu">
                <div className="account-menu-head">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </div>
                {accountLinks.map((l) => (
                  <Link key={l.to} to={l.to} role="menuitem">{l.label}</Link>
                ))}
                <button type="button" role="menuitem" className="account-logout" onClick={() => logout.mutate()}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="btn-secondary btn-sm nav-login">Entrar</Link>
        )}

        <div className="nav-mobile" ref={mobileRef}>
          <button
            type="button"
            className="nav-burger"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
          {menuOpen && (
            <div className="mobile-menu">
              {LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
              <hr />
              {loggedIn ? (
                <>
                  {accountLinks.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
                  <button type="button" className="account-logout" onClick={() => logout.mutate()}>Cerrar sesión</button>
                </>
              ) : (
                <Link to="/login">Entrar</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
