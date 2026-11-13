import { prisma } from '../lib/prisma';
import { deleteUpload } from '../lib/storage';
import { AppError } from '../middlewares/error.middleware';

export async function listCertificates(barberId: string) {
  return prisma.certificate.findMany({
    where: { barberId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createCertificate(
  barberId: string,
  title: string,
  description: string | undefined,
  fileUrl: string,
  fileType: string,
) {
  return prisma.certificate.create({
    data: { barberId, title, description, fileUrl, fileType },
  });
}

export async function deleteCertificate(
  certId: string,
  barberId: string,
) {
  const cert = await prisma.certificate.findUnique({ where: { id: certId } });
  if (!cert) throw new AppError(404, 'Certificado no encontrado');
  if (cert.barberId !== barberId) throw new AppError(403, 'Sin permisos para eliminar este certificado');

  await prisma.certificate.delete({ where: { id: certId } });
  await deleteUpload(cert.fileUrl);
}
