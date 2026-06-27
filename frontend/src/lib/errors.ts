import { AxiosError } from 'axios';

/**
 * Extrae un mensaje legible de un error de API.
 * El backend responde con `{ message: string }` y, en validaciones Zod,
 * a veces con `{ message, errors: [...] }`. Priorizamos ese mensaje sobre
 * el genérico de axios.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string; errors?: Array<{ message?: string }> } | undefined;
    if (data?.errors?.length && data.errors[0]?.message) return data.errors[0].message;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
