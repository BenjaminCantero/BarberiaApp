import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import type { CreateServiceInput, UpdateServiceInput } from '../schemas/service.schema';

export async function listServices() {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function getServiceById(id: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new AppError(404, 'Servicio no encontrado');
  return service;
}

export async function createService(data: CreateServiceInput) {
  return prisma.service.create({ data });
}

export async function updateService(id: string, data: UpdateServiceInput) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new AppError(404, 'Servicio no encontrado');
  return prisma.service.update({ where: { id }, data });
}

export async function deleteService(id: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new AppError(404, 'Servicio no encontrado');
  // Soft delete: marcar como inactivo para no romper citas históricas
  return prisma.service.update({ where: { id }, data: { isActive: false } });
}
