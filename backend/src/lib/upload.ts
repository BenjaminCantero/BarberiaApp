import multer from 'multer';

/**
 * Multer guarda el archivo en memoria; luego lib/storage decide si va a
 * Vercel Blob o al disco local. Límite 4 MB: las funciones de Vercel aceptan
 * como máximo 4,5 MB por petición (el frontend comprime las fotos antes).
 */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const storage = multer.memoryStorage();

const CERTIFICATE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']);

export const certificateUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (CERTIFICATE_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG/PNG y archivos PDF'));
    }
  },
});

const PORTFOLIO_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export const portfolioUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (PORTFOLIO_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'));
    }
  },
});
