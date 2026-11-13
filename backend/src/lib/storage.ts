import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { put, del } from '@vercel/blob';

/**
 * Almacenamiento de archivos subidos (fotos de portafolio, certificados).
 *
 * - Con BLOB_READ_WRITE_TOKEN (Vercel): se guardan en Vercel Blob y se devuelve
 *   su URL pública absoluta. El disco de una función serverless no persiste.
 * - Sin token (local / Docker): se guardan en ./uploads y se sirven en /uploads.
 */
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export type UploadFolder = 'portfolio' | 'certificates';

interface IncomingFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

function useBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function randomName(originalname: string) {
  return `${crypto.randomBytes(12).toString('hex')}${path.extname(originalname).toLowerCase()}`;
}

/** Guarda el archivo y devuelve la URL con la que se sirve. */
export async function storeUpload(file: IncomingFile, folder: UploadFolder): Promise<string> {
  const name = randomName(file.originalname);

  if (useBlob()) {
    const blob = await put(`${folder}/${name}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    return blob.url;
  }

  await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOADS_DIR, name), file.buffer);
  return `/uploads/${name}`;
}

/** Borra un archivo guardado con storeUpload. Nunca lanza: un archivo huérfano no debe romper la operación. */
export async function deleteUpload(url: string): Promise<void> {
  try {
    if (/^https?:\/\//.test(url)) {
      if (useBlob()) await del(url);
      return;
    }
    const filePath = path.join(UPLOADS_DIR, path.basename(url));
    if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  } catch (err) {
    console.error('[storage] no se pudo borrar', url, err);
  }
}
