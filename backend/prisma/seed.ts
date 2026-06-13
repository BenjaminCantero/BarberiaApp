import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('Admin1234', 12);
  const barberHash = await bcrypt.hash('Barber1234', 12);
  const clientHash = await bcrypt.hash('Client1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@barberia.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@barberia.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  const barberUser = await prisma.user.upsert({
    where: { email: 'carlos@barberia.com' },
    update: {},
    create: {
      name: 'Carlos López',
      email: 'carlos@barberia.com',
      passwordHash: barberHash,
      role: Role.BARBER,
      phone: '+34 611 222 333',
    },
  });

  const barber = await prisma.barber.upsert({
    where: { userId: barberUser.id },
    update: {},
    create: {
      userId: barberUser.id,
      bio: 'Barbero profesional con 10 años de experiencia. Especialista en cortes clásicos y barba.',
    },
  });

  await prisma.user.upsert({
    where: { email: 'cliente@example.com' },
    update: {},
    create: {
      name: 'Ana Martínez',
      email: 'cliente@example.com',
      passwordHash: clientHash,
      role: Role.CLIENT,
    },
  });

  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 'svc-corte' },
      update: {},
      create: {
        id: 'svc-corte',
        name: 'Corte de cabello',
        description: 'Corte clásico con tijera o máquina',
        durationMin: 30,
        price: 15,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-barba' },
      update: {},
      create: {
        id: 'svc-barba',
        name: 'Arreglo de barba',
        description: 'Perfilado y arreglo de barba con navaja',
        durationMin: 20,
        price: 10,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-combo' },
      update: {},
      create: {
        id: 'svc-combo',
        name: 'Combo corte + barba',
        description: 'Corte de cabello y arreglo de barba completo',
        durationMin: 45,
        price: 22,
      },
    }),
  ]);

  for (const service of services) {
    await prisma.barberService.upsert({
      where: { barberId_serviceId: { barberId: barber.id, serviceId: service.id } },
      update: {},
      create: { barberId: barber.id, serviceId: service.id },
    });
  }

  // Horario de lunes a viernes 9:00 - 19:00, sábados 10:00 - 15:00
  const weekdays = [1, 2, 3, 4, 5];
  for (const day of weekdays) {
    await prisma.schedule.upsert({
      where: { id: `sch-${barber.id}-${day}` },
      update: {},
      create: {
        id: `sch-${barber.id}-${day}`,
        barberId: barber.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '19:00',
      },
    });
  }
  await prisma.schedule.upsert({
    where: { id: `sch-${barber.id}-6` },
    update: {},
    create: {
      id: `sch-${barber.id}-6`,
      barberId: barber.id,
      dayOfWeek: 6,
      startTime: '10:00',
      endTime: '15:00',
    },
  });

  console.log('Seed completado:');
  console.log('  Admin:   admin@barberia.com / Admin1234');
  console.log('  Barbero: carlos@barberia.com / Barber1234');
  console.log('  Cliente: cliente@example.com / Client1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
