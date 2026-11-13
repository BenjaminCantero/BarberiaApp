import { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { withAppointmentContact } from '../lib/appointment-contact';
import { AppError } from '../middlewares/error.middleware';
import * as notifications from './notification.service';
import { getZonedDayOfWeek, getZonedHHMM } from '../lib/timezone';
import type { CreateAppointmentInput } from '../schemas/appointment.schema';

const APPOINTMENT_SELECT = {
  id: true,
  startAt: true,
  endAt: true,
  status: true,
  notes: true,
  createdAt: true,
  guestName: true,
  guestEmail: true,
  guestPhone: true,
  client: { select: { id: true, name: true, email: true, phone: true } },
  barber: {
    select: {
      id: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  },
  service: { select: { id: true, name: true, durationMin: true, price: true } },
  review: { select: { id: true, rating: true } },
};

export async function createAppointment(clientId: string | null, data: CreateAppointmentInput, guest?: { name: string; email: string; phone?: string }) {
  if (!clientId && !guest) throw new AppError(400, 'Nombre y correo son obligatorios');
  const { barberId, serviceId, startAt: startAtStr, notes } = data;

  // Verificar barbero activo
  const barber = await prisma.barber.findUnique({ where: { id: barberId, isActive: true } });
  if (!barber) throw new AppError(404, 'Barbero no encontrado o inactivo');

  // Verificar servicio asignado al barbero
  const barberService = await prisma.barberService.findUnique({
    where: { barberId_serviceId: { barberId, serviceId } },
    include: { service: true },
  });
  if (!barberService) throw new AppError(400, 'El barbero no ofrece este servicio');
  if (barberService.service.isActive === false) throw new AppError(400, 'El servicio no está disponible');

  const startAt = new Date(startAtStr);
  if (startAt <= new Date()) throw new AppError(400, 'La cita debe ser en el futuro');

  const endAt = new Date(startAt.getTime() + barberService.service.durationMin * 60_000);

  // Verificar que el barbero esté en horario ese día (en la zona de la barbería)
  const dayOfWeek = getZonedDayOfWeek(startAt);
  const timeStr = getZonedHHMM(startAt); // "HH:MM"

  const schedule = await prisma.schedule.findFirst({
    where: { barberId, dayOfWeek, isActive: true },
  });
  if (!schedule) throw new AppError(400, 'El barbero no trabaja ese día');

  const endTimeStr = getZonedHHMM(endAt);
  if (timeStr < schedule.startTime || endTimeStr > schedule.endTime || endAt.getTime() - startAt.getTime() >= 86_400_000 || endTimeStr <= timeStr) {
    throw new AppError(400, 'El horario solicitado está fuera del turno del barbero');
  }

  // Verificar colisión y crear de forma ATÓMICA para evitar dobles reservas
  // bajo concurrencia (dos clientes pidiendo el mismo slot a la vez).
  // El nivel Serializable garantiza que dos transacciones simultáneas que
  // lean el mismo rango de citas no puedan ambas confirmar e insertar.
  let appointment;
  try {
    appointment = await prisma.$transaction(
      async (tx) => {
        const collision = await tx.appointment.findFirst({
          where: {
            barberId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
          },
          select: { id: true },
        });
        if (collision) throw new AppError(409, 'El horario ya está ocupado. Elige otro slot.');

        return tx.appointment.create({
          data: { clientId, barberId, serviceId, startAt, endAt, notes,
            guestName: guest?.name, guestEmail: guest?.email, guestPhone: guest?.phone },
          select: APPOINTMENT_SELECT,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    // Si dos transacciones Serializable chocan, Postgres aborta una con
    // error de serialización: lo traducimos a un 409 amistoso.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      throw new AppError(409, 'El horario ya está ocupado. Elige otro slot.');
    }
    throw err;
  }

  // Notificar (no bloquea la respuesta si el email falla)
  notifications.notifyAppointmentCreated(withAppointmentContact(appointment)).catch((err) => console.error('[email:booking]', err));

  return withAppointmentContact(appointment);
}

export async function rescheduleAppointment(
  id: string,
  userId: string,
  role: string,
  newStartAtStr: string,
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, clientId: true, barberId: true, serviceId: true, status: true, startAt: true },
  });
  if (!appointment) throw new AppError(404, 'Cita no encontrada');

  // Solo el cliente dueño, el barbero asignado o un admin pueden reprogramar
  if (role === 'CLIENT' && appointment.clientId !== userId) {
    throw new AppError(403, 'No tienes acceso a esta cita');
  }
  if (role === 'BARBER') {
    const barber = await prisma.barber.findUnique({ where: { userId } });
    if (!barber || appointment.barberId !== barber.id) {
      throw new AppError(403, 'No tienes acceso a esta cita');
    }
  }

  if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
    throw new AppError(400, 'Solo se pueden reprogramar citas pendientes o confirmadas');
  }

  // El cliente debe reprogramar con al menos 2 horas de antelación
  if (role === 'CLIENT') {
    const hoursUntil = (appointment.startAt.getTime() - Date.now()) / 3_600_000;
    if (hoursUntil < 2) {
      throw new AppError(400, 'Solo puedes reprogramar con al menos 2 horas de antelación');
    }
  }

  const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } });
  if (!service) throw new AppError(404, 'Servicio no encontrado');

  const startAt = new Date(newStartAtStr);
  if (startAt <= new Date()) throw new AppError(400, 'La cita debe ser en el futuro');
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

  // Validar que el nuevo horario esté dentro del turno del barbero (zona de la barbería)
  const dayOfWeek = getZonedDayOfWeek(startAt);
  const timeStr = getZonedHHMM(startAt);
  const endTimeStr = getZonedHHMM(endAt);
  const schedule = await prisma.schedule.findFirst({
    where: { barberId: appointment.barberId, dayOfWeek, isActive: true },
  });
  if (!schedule) throw new AppError(400, 'El barbero no trabaja ese día');
  if (timeStr < schedule.startTime || endTimeStr > schedule.endTime || endTimeStr <= timeStr) {
    throw new AppError(400, 'El horario solicitado está fuera del turno del barbero');
  }

  let updated;
  try {
    updated = await prisma.$transaction(
      async (tx) => {
        const collision = await tx.appointment.findFirst({
          where: {
            barberId: appointment.barberId,
            id: { not: id },
            status: { in: ['PENDING', 'CONFIRMED'] },
            AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
          },
          select: { id: true },
        });
        if (collision) throw new AppError(409, 'El horario ya está ocupado. Elige otro slot.');

        return tx.appointment.update({
          where: { id },
          data: { startAt, endAt, reminderSentAt: null },
          select: APPOINTMENT_SELECT,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      throw new AppError(409, 'El horario ya está ocupado. Elige otro slot.');
    }
    throw err;
  }

  notifications.notifyAppointmentRescheduled(withAppointmentContact(updated)).catch((err) => console.error('[email:reschedule]', err));

  return withAppointmentContact(updated);
}

export async function getMyAppointments(
  userId: string,
  role: string,
  filters: { status?: AppointmentStatus; date?: string },
) {
  const where: Record<string, unknown> = {};

  if (role === 'CLIENT') {
    where.clientId = userId;
  } else if (role === 'BARBER') {
    const barber = await prisma.barber.findUnique({ where: { userId } });
    if (!barber) throw new AppError(404, 'Perfil de barbero no encontrado');
    where.barberId = barber.id;
  }

  if (filters.status) where.status = filters.status;

  if (filters.date) {
    const dayStart = new Date(`${filters.date}T00:00:00`);
    const dayEnd = new Date(`${filters.date}T23:59:59`);
    where.startAt = { gte: dayStart, lte: dayEnd };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    select: APPOINTMENT_SELECT,
    orderBy: { startAt: 'asc' },
  });
  return appointments.map(withAppointmentContact);
}

export async function getAppointmentById(id: string, userId: string, role: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { ...APPOINTMENT_SELECT, clientId: true, barberId: true },
  });
  if (!appointment) throw new AppError(404, 'Cita no encontrada');

  if (role === 'CLIENT' && appointment.clientId !== userId) {
    throw new AppError(403, 'No tienes acceso a esta cita');
  }

  if (role === 'BARBER') {
    const barber = await prisma.barber.findUnique({ where: { userId } });
    if (!barber || appointment.barberId !== barber.id) {
      throw new AppError(403, 'No tienes acceso a esta cita');
    }
  }

  return withAppointmentContact(appointment);
}

export async function updateAppointmentStatus(
  id: string,
  userId: string,
  role: string,
  newStatus: AppointmentStatus,
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, clientId: true, barberId: true, status: true, startAt: true },
  });
  if (!appointment) throw new AppError(404, 'Cita no encontrada');

  // Validar permisos según rol
  if (role === 'CLIENT') {
    if (appointment.clientId !== userId) throw new AppError(403, 'No tienes acceso a esta cita');
    if (newStatus !== 'CANCELLED') throw new AppError(403, 'Los clientes solo pueden cancelar citas');

    // Regla: cancelar con al menos 2 horas de antelación
    const hoursUntil = (appointment.startAt.getTime() - Date.now()) / 3_600_000;
    if (hoursUntil < 2) {
      throw new AppError(400, 'Solo puedes cancelar con al menos 2 horas de antelación');
    }
  }

  if (role === 'BARBER') {
    const barber = await prisma.barber.findUnique({ where: { userId } });
    if (!barber || appointment.barberId !== barber.id) {
      throw new AppError(403, 'No tienes acceso a esta cita');
    }
  }

  // Validar transiciones de estado
  const validTransitions: Record<string, AppointmentStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  if (!validTransitions[appointment.status].includes(newStatus)) {
    throw new AppError(
      400,
      `No se puede cambiar de ${appointment.status} a ${newStatus}`,
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: newStatus },
    select: APPOINTMENT_SELECT,
  });

  if (newStatus === 'CONFIRMED') {
    notifications.notifyAppointmentConfirmed(withAppointmentContact(updated)).catch((err) => console.error('[email:confirmed]', err));
  } else if (newStatus === 'CANCELLED') {
    notifications.notifyAppointmentCancelled(withAppointmentContact(updated), role).catch((err) => console.error('[email:cancelled]', err));
  }

  return withAppointmentContact(updated);
}
