/** URL pública del perfil de Instagram a partir del usuario guardado. */
export function instagramUrl(handle: string) {
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}
