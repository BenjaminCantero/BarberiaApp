/** Usuario de Instagram válido: letras, números, punto y guion bajo, hasta 30. */
export const INSTAGRAM_HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;

/**
 * Normaliza lo que escribe el barbero: "@usuario", "usuario" o la URL del perfil.
 * - undefined → undefined (no modificar)
 * - vacío     → null      (borrar)
 */
export function normalizeInstagram(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  let v = value.trim();
  const fromUrl = v.match(/instagram\.com\/([^/?#]+)/i);
  if (fromUrl) v = fromUrl[1];
  v = v.replace(/^@+/, '').trim();
  return v === '' ? null : v;
}
