# BarberiaApp

Sistema de reserva de citas para barberías. Monorepo con **backend** (Express + Prisma + PostgreSQL) y **frontend** (React + Vite + Tailwind).

## Características

- Reservas públicas sin cuenta: nombre, correo y teléfono opcional. Los datos se guardan en la cita; no se crea un usuario.
- Avisos y recordatorios por correo para citas pendientes y confirmadas. Los cambios se coordinan directamente con la barbería.

### Actualización: reservas sin cuenta

Antes de arrancar una instalación existente, ejecutar `cd backend && npx prisma migrate deploy`.
Configurar `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL` y `SHOP_TIMEZONE` para recibir correos reales. Sin SMTP los intentos fallan y los recordatorios no se marcan como enviados, permitiendo reintentarlos al configurar el proveedor.
La ruta pública `POST /api/appointments/guest` limita las solicitudes por IP; el resto de la gestión de citas sigue protegido.

- Reserva de citas con cálculo de disponibilidad en tiempo real
- Roles: cliente, barbero y administrador
- Confirmación, cancelación y **reprogramación** de citas con reglas de negocio
- **Notificaciones por email** (reserva, confirmación, cancelación, reprogramación) y **recordatorios automáticos** 24h antes
- **Reseñas y calificaciones** de barberos (promedio, listado público, una reseña por cita completada)
- **Reportes de negocio** para el dueño: ingresos, ocupación, ticket promedio, top servicios y barberos por rango de fechas
- **Recuperación de contraseña** y **verificación de email** por enlace de un solo uso
- Gestión de servicios, horarios semanales y certificados de barberos
- Panel de administración con estadísticas
- Autenticación JWT con refresh tokens en cookie httpOnly
- Documentación de la API con Swagger (`/api/docs`)

## Desarrollo local

Requisitos: Node 20+, PostgreSQL.

```bash
# 1. Backend
cd backend
cp .env.example .env          # configurá DATABASE_URL y secretos JWT
npm install
npm run db:migrate            # aplica migraciones
npm run db:seed               # datos de ejemplo (opcional)
npm run dev                   # http://localhost:3000

# 2. Frontend (en otra terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

O desde la raíz: `npm run install:all`, luego `npm run dev:backend` y `npm run dev:frontend`.

## Tests

```bash
cd backend && npm test        # lógica de horarios/disponibilidad (Vitest)
```

## Despliegue con Docker

Levanta PostgreSQL + backend + frontend (nginx) con un solo comando:

```bash
# Definí los secretos requeridos (no usar valores por defecto en producción)
export JWT_ACCESS_SECRET="..."
export JWT_REFRESH_SECRET="..."

docker compose up --build
# Frontend en http://localhost:8080  ·  API proxyeada en /api
```

Variables opcionales: `SHOP_NAME`, `SHOP_TIMEZONE`, `SMTP_*` (ver `backend/.env.example`).
Si no se configura SMTP, los emails se registran en consola en vez de enviarse.

## Estructura

```
backend/   API REST (Express, Prisma, Zod, JWT)
frontend/  SPA (React, React Query, Zustand, Tailwind)
```
