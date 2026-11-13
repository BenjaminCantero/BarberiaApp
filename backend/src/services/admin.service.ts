import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { withAppointmentContact } from '../lib/appointment-contact';
import { AppError } from '../middlewares/error.middleware';
import { getZonedDateStr, zonedDayRange } from '../lib/timezone';
import type {
  ChangeRoleInput,
  ChangeStatusInput,
  CreateBarberInput,
  UpdateBarberAccountInput,
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
  if (!('userId' in data)) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new AppError(409, 'El correo ya está registrado');

    const passwordHash = await bcrypt.hash(data.password, 12);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          passwordHash,
          role: 'BARBER',
          emailVerified: true,
        },
      });
      return tx.barber.create({
        data: { userId: user.id, bio: data.bio ?? '' },
        include: { user: { select: { name: true, email: true, phone: true } } },
      });
    });
  }

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

export async function updateBarberAccount(barberId: string, data: UpdateBarberAccountInput) {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { userId: true, user: { select: { email: true } } },
  });
  if (!barber) throw new AppError(404, 'Barbero no encontrado');

  const email = data.email?.trim().toLowerCase();
  if (email && email !== barber.user.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner) throw new AppError(409, 'El correo ya está registrado');
  }

  const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : undefined;
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: barber.userId },
      data: {
        name: data.name,
        email,
        phone: data.phone === '' ? null : data.phone,
        passwordHash,
        ...(email ? { emailVerified: true } : {}),
      },
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
    });
    if (passwordHash) {
      await tx.refreshToken.deleteMany({ where: { userId: barber.userId } });
    }
    return user;
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
    const { start, end } = zonedDayRange(date);
    where.startAt = { gte: start, lt: end };
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

  return { appointments: appointments.map(withAppointmentContact), total, page, limit, pages: Math.ceil(total / limit) };
}

export async function listAllServices() {
  return prisma.service.findMany({ orderBy: { name: 'asc' } });
}

/**
 * Reporte de negocio para el dueño: ingresos, ocupación, servicios y barberos
 * top en un rango de fechas. Los ingresos se calculan sobre citas COMPLETADAS.
 * Rangos y agrupado por día usan la zona horaria de la barbería.
 */
export async function getReports(fromStr?: string, toStr?: string) {
  const now = new Date();
  // Por defecto: desde el primer día del mes actual hasta hoy (en la zona de la barbería).
  const today = getZonedDateStr(now);
  const from = zonedDayRange(fromStr ?? `${today.slice(0, 8)}01`).start;
  const to = toStr ? zonedDayRange(toStr).end : now;

  const inRange = { startAt: { gte: from, lt: to } };

  const rangeLength = Math.max(1, to.getTime() - from.getTime());
  const previousFrom = new Date(from.getTime() - rangeLength);
  const [completed, statusRows, previousCompleted, newClients] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...inRange, status: 'COMPLETED' },
      select: {
        startAt: true,
        service: { select: { id: true, name: true, price: true } },
        barber: { select: { id: true, user: { select: { name: true } } } },
      },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: inRange,
      _count: { status: true },
    }),
    prisma.appointment.findMany({
      where: { startAt: { gte: previousFrom, lt: from }, status: 'COMPLETED' },
      select: { service: { select: { price: true } } },
    }),
    prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: from, lt: to } } }),
  ]);

  const status = Object.fromEntries(statusRows.map((row) => [row.status, row._count.status]));
  const cancelledCount = status.CANCELLED ?? 0;
  const totalInRange = Object.values(status).reduce((sum, count) => sum + count, 0);
  const previousRevenue = previousCompleted.reduce((sum, item) => sum + Number(item.service.price), 0);

  let revenue = 0;
  const byService = new Map<string, { id: string; name: string; count: number; revenue: number }>();
  const byBarber = new Map<string, { id: string; name: string; count: number; revenue: number }>();
  const byDay = new Map<string, number>();

  for (const a of completed) {
    const price = Number(a.service.price);
    revenue += price;

    const s = byService.get(a.service.id) ?? { id: a.service.id, name: a.service.name, count: 0, revenue: 0 };
    s.count += 1;
    s.revenue += price;
    byService.set(a.service.id, s);

    const b = byBarber.get(a.barber.id) ?? { id: a.barber.id, name: a.barber.user.name, count: 0, revenue: 0 };
    b.count += 1;
    b.revenue += price;
    byBarber.set(a.barber.id, b);

    const day = getZonedDateStr(a.startAt);
    byDay.set(day, (byDay.get(day) ?? 0) + price);
  }

  const round = (n: number) => Number(n.toFixed(2));

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    revenue: round(revenue),
    completed: completed.length,
    cancelled: cancelledCount,
    total: totalInRange,
    completionRate: totalInRange ? Number(((completed.length / totalInRange) * 100).toFixed(1)) : 0,
    averageTicket: completed.length ? round(revenue / completed.length) : 0,
    previousRevenue: round(previousRevenue),
    revenueChange: previousRevenue
      ? Number((((revenue - previousRevenue) / previousRevenue) * 100).toFixed(1))
      : revenue > 0 ? 100 : 0,
    newClients,
    status: {
      pending: status.PENDING ?? 0,
      confirmed: status.CONFIRMED ?? 0,
      completed: status.COMPLETED ?? 0,
      cancelled: cancelledCount,
    },
    topServices: [...byService.values()]
      .map((s) => ({ ...s, revenue: round(s.revenue) }))
      .sort((a, b) => b.revenue - a.revenue),
    topBarbers: [...byBarber.values()]
      .map((b) => ({ ...b, revenue: round(b.revenue) }))
      .sort((a, b) => b.revenue - a.revenue),
    revenueByDay: [...byDay.entries()]
      .map(([date, rev]) => ({ date, revenue: round(rev) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
