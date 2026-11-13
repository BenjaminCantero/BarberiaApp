import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const THEME_COLOR: Record<Theme, string> = { light: '#f6f4ef', dark: '#0c0b0d' };

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Transición breve solo durante el cambio, para no animar cada render.
  root.classList.add('theme-anim');
  root.dataset.theme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  window.setTimeout(() => root.classList.remove('theme-anim'), 300);
}

/**
 * Tema claro/oscuro. El valor inicial lo fija el script de index.html (preferencia
 * guardada o la del sistema); aquí solo se lee y se cambia.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  // Si el usuario nunca eligió, seguir los cambios del sistema.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      let stored: string | null = null;
      try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* sin storage */ }
      if (stored) return;
      const next: Theme = media.matches ? 'light' : 'dark';
      applyTheme(next);
      setTheme(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* sin storage */ }
    setTheme(next);
  }, []);

  return { theme, toggle };
}
