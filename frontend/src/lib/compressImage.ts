/**
 * Reduce una foto antes de subirla: lado mayor ≤ maxSide y WebP (o JPEG si el
 * navegador no codifica WebP). El servidor acepta hasta 4 MB por archivo
 * (límite de las funciones de Vercel), y una foto de celular suele pesar más.
 * Si la imagen ya es chica y liviana, se devuelve tal cual.
 */
export async function compressImage(file: File, maxSide = 2000, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // formato que el navegador no decodifica: que valide el servidor

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob('image/webp');
  let type = 'image/webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob('image/jpeg');
    type = 'image/jpeg';
  }
  if (!blob || blob.size >= file.size) return file;

  const base = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.${type === 'image/webp' ? 'webp' : 'jpg'}`, { type });
}
