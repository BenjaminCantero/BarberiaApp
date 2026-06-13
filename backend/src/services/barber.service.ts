import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import type { UpdateBarberInput, SetScheduleInput } from '../schemas/barber.schema';
import { getAvailableSlots } from './availability.service';

export async function getMyBarber(userId: string) {
  const barber = await prisma.barber.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, phone: true, avatarUrl: true } },
      services: {
        include: { service: true },
        where: { service: { isActive: true } },
      },
      schedules: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
    },
  });
  if (!barber) throw new AppError(404, 'Perfil de barbero no encontrado');
  return barber;
}

export async function listBarbers() {
  return prisma.barber.findMany({
    where: { isActive: true },
    include: {
      user: { select: { name: true, email: true, phone: true, avatarUrl: true } },
      services: {
        include: { service: true },
        where: { service: { isActive: true } },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });
}

export async function getBarberById(id: string) {
  const barber = await prisma.barber.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true, avatarUrl: true } },
      services: {
        include: { service: true },
        where: { service: { isActive: true } },
      },
      schedules: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
    },
  });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');
  return barber;
}

export async function updateBarber(id: string, requesterId: string, requesterRole: string, data: UpdateBarberInput) {
  const barber = await prisma.barber.findUnique({ where: { id } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  // Solo el propio barbero o un admin pueden editar
  if (requesterRole !== 'ADMIN' && barber.userId !== requesterId) {
    throw new AppError(403, 'Sin permisos para editar este barbero');
  }

  return prisma.barber.update({ where: { id }, data });
}

export async function setSchedule(barberId: string, requesterId: string, requesterRole: string, input: SetScheduleInput) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  if (requesterRole !== 'ADMIN' && barber.userId !== requesterId) {
    throw new AppError(403, 'Sin permisos para editar el horario de este barbero');
  }

  // Validar que startTime < endTime en cada entrada
  for (const entry of input.schedule) {
    const [sh, sm] = entry.startTime.split(':').map(Number);
    const [eh, em] = entry.endTime.split(':').map(Number);
    if (sh * 60 + sm >= eh * 60 + em) {
      throw new AppError(400, `El horario del día ${entry.dayOfWeek} tiene hora inicio >= hora fin`);
    }
  }

  // Reemplazar horario completo del barbero
  await prisma.schedule.deleteMany({ where: { barberId } });

  const created = await prisma.schedule.createMany({
    data: input.schedule.map((s) => ({ ...s, barberId })),
  });

  return { count: created.count };
}

export async function getSchedule(barberId: string) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  return prisma.schedule.findMany({
    where: { barberId },
    orderBy: { dayOfWeek: 'asc' },
  });
}

export async function assignService(barberId: string, serviceId: string, requesterId: string, requesterRole: string) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  if (requesterRole !== 'ADMIN' && barber.userId !== requesterId) {
    throw new AppError(403, 'Sin permisos');
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId, isActive: true } });
  if (!service) throw new AppError(404, 'Servicio no encontrado');

  const existing = await prisma.barberService.findUnique({
    where: { barberId_serviceId: { barberId, serviceId } },
  });
  if (existing) throw new AppError(409, 'El servicio ya está asignado a este barbero');

  return prisma.barberService.create({ data: { barberId, serviceId } });
}

export async function removeService(barberId: string, serviceId: string, requesterId: string, requesterRole: string) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  if (requesterRole !== 'ADMIN' && barber.userId !== requesterId) {
    throw new AppError(403, 'Sin permisos');
  }

  await prisma.barberService.deleteMany({ where: { barberId, serviceId } });
}

export { getAvailableSlots };
