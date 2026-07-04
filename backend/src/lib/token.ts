import crypto from 'crypto';

/**
 * Genera un token de un solo uso para links por email (reset de contraseña,
 * verificación de cuenta).
 *
 * Devuelve el token en claro (va en el link que recibe el usuario) y su hash
 * SHA-256 (lo único que se persiste). Así, aunque se filtre la base de datos,
 * los tokens no son reutilizables porque solo guardamos el hash.
 */
export function generateToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
