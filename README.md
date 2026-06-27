# BarberiaApp

Sistema de reserva de citas para barberías. Monorepo con **backend** (Express + Prisma + PostgreSQL) y **frontend** (React + Vite + Tailwind).

## Características

- Reserva de citas con cálculo de disponibilidad en tiempo real
- Roles: cliente, barbero y administrador
- Confirmación, cancelación y **reprogramación** de citas con reglas de negocio
- **Notificaciones por email** (reserva, confirmación, cancelación, reprogramación) y **recordatorios automáticos** 24h antes
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
