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

## Despliegue en Vercel

El repositorio se despliega como un solo proyecto con dos servicios (ver `vercel.json`):
`backend` (Express) recibe `/api/*` y `frontend` (Vite) recibe todo lo demás.

1. **Base de datos (Supabase).** En *Project Settings → Database → Connection string*:
   - `DATABASE_URL`: el *Transaction pooler* (puerto 6543) agregando `?pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL`: la conexión directa o el *Session pooler* (puerto 5432).
2. **Migraciones**, desde tu máquina y apuntando a Supabase (no corren en el build):
   ```bash
   cd backend
   DATABASE_URL="<pooler 6543>" DIRECT_URL="<directa 5432>" npx prisma migrate deploy
   # Opcional, solo la primera vez: datos de ejemplo
   DATABASE_URL="<pooler 6543>" DIRECT_URL="<directa 5432>" npm run db:seed
   ```
3. **Archivos subidos.** En el proyecto de Vercel: *Storage → Create → Blob* y conectarlo al proyecto.
   Vercel agrega `BLOB_READ_WRITE_TOKEN`; con esa variable las fotos y certificados se guardan en Blob.
   Las subidas se limitan a 4 MB (límite de las funciones de Vercel); el panel comprime las fotos antes de subirlas.
4. **Variables de entorno** del proyecto: `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET`, `FRONTEND_URL` (el dominio público, p. ej. `https://dragonstudio.vercel.app`,
   usado en los enlaces de los correos), `CRON_SECRET` (cualquier cadena aleatoria larga),
   `SHOP_TIMEZONE` y las `SMTP_*` para enviar correos reales.
5. **Recordatorios.** Vercel Cron llama a `GET /api/cron/reminders` una vez al día a las 12:00 UTC
   (límite del plan Hobby) y envía los recordatorios de las citas de las próximas 24 horas.
   En plan Pro se puede pasar a cada hora cambiando `schedule` a `"0 * * * *"` en `vercel.json`.

Fuera de Vercel (local o Docker) nada de esto cambia: el backend levanta su propio servidor,
guarda las subidas en `backend/uploads` y corre el barrido de recordatorios cada hora.

## Estructura

```
backend/   API REST (Express, Prisma, Zod, JWT)
frontend/  SPA (React, React Query, Zustand, Tailwind)
```
