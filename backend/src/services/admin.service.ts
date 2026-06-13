import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import type {
  ChangeRoleInput,
  ChangeStatusInput,
  CreateBarberInput,
  AdminAppointmentQuery,
} from '../schemas/admin.schema';

export async function getStats() {
  const [totalUsers, totalBarbers, appointmentRows] = await Promise.all([
    prisma.user.count(),
    prisma.barber.count({ where: { isActive: true } }),
    prisma.appointment.groupBy({ by: ['status'], _count: { status: true } }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of appointmentRows) {
    byStatus[row.status] = row._count.status;
  }

  return {
    totalUsers,
    totalBarbers,
    appointments: {
      pending: byStatus['PENDING'] ?? 0,
      confirmed: byStatus['CONFIRMED'] ?? 0,
      completed: byStatus['COMPLETED'] ?? 0,
      cancelled: byStatus['CANCELLED'] ?? 0,
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    },
  };
}

export async function listUsers(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        barber: { select: { id: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);
  return { users, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function changeUserRole(userId: string, data: ChangeRoleInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Usuario no encontrado');
  return prisma.user.update({
    where: { id: userId },
    data: { role: data.role },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
}

export async function changeUserStatus(userId: string, data: ChangeStatusInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Usuario no encontrado');
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: data.isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
}

export async function createBarberFromUser(data: CreateBarberInput) {
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new AppError(404, 'Usuario no encontrado');

  const existing = await prisma.barber.findUnique({ where: { userId: data.userId } });
  if (existing) throw new AppError(409, 'Este usuario ya tiene un perfil de barbero');

  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: data.userId }, data: { role: 'BARBER' } });
    return tx.barber.create({
      data: { userId: data.userId, bio: data.bio ?? '' },
      include: { user: { select: { name: true, email: true } } },
    });
  });
}

export async function listAllAppointments(query: AdminAppointmentQuery) {
  const { status, barberId, date, page, limit } = query;
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) where.status = status;
  if (barberId) where.barberId = barberId;
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);
    where.startAt = { gte: start, lte: end };
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      include: {
        client: { select: { name: true, email: true, phone: true } },
        barber: { include: { user: { select: { name: true } } } },
        service: { select: { name: true, price: true } },
      },
      orderBy: { startAt: 'desc' },
    }),
    prisma.appointment.count({ where }),
  ]);

  return { appointments, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function listAllServices() {
  return prisma.service.findMany({ orderBy: { name: 'asc' } });
}
