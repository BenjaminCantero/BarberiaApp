import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Servicio de notificaciones por email.
 *
 * Es "pluggable": si no hay credenciales SMTP configuradas (SMTP_HOST/SMTP_USER),
 * el servicio no falla — registra el email en consola. Esto permite desarrollar
 * sin un proveedor de correo y activar el envío real en producción solo con
 * variables de entorno.
 */

const SHOP_NAME = process.env.SHOP_NAME ?? 'Barbería';
const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE ?? 'America/Argentina/Buenos_Aires';
const FROM = process.env.SMTP_FROM ?? 'no-reply@barberia.app';

let transporter: Transporter | null = null;
const smtpEnabled = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

function getTransporter(): Transporter | null {
  if (!smtpEnabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    // Modo desarrollo / sin SMTP: dejamos rastro en consola.
    console.log(`[email:skipped] → ${to} | ${subject}`);
    return;
  }
  await tx.sendMail({ from: `${SHOP_NAME} <${FROM}>`, to, subject, html });
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SHOP_TIMEZONE,
  }).format(d);
}

// Forma mínima de la cita que necesitan las notificaciones.
export interface AppointmentForEmail {
  startAt: Date | string;
  client: { name: string; email: string };
  barber: { user: { name: string; email: string } };
  service: { name: string };
}

function layout(title: string, body: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; color: #1f2937;">
      <h2 style="color: #111827;">${title}</h2>
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#6b7280;">${SHOP_NAME} · Este es un mensaje automático.</p>
    </div>`;
}

export async function notifyAppointmentCreated(appt: AppointmentForEmail): Promise<void> {
  const when = formatDate(appt.startAt);
  // Al cliente
  await send(
    appt.client.email,
    `Tu reserva en ${SHOP_NAME} está pendiente de confirmación`,
    layout('Reserva recibida', `
      <p>Hola <strong>${appt.client.name}</strong>,</p>
      <p>Recibimos tu solicitud de cita:</p>
      <ul>
        <li><strong>Servicio:</strong> ${appt.service.name}</li>
        <li><strong>Barbero:</strong> ${appt.barber.user.name}</li>
        <li><strong>Fecha y hora:</strong> ${when}</li>
      </ul>
      <p>Te avisaremos cuando el barbero la confirme.</p>`),
  );
  // Al barbero
  await send(
    appt.barber.user.email,
    `Nueva reserva de ${appt.client.name}`,
    layout('Nueva reserva', `
      <p>Tenés una nueva solicitud de cita:</p>
      <ul>
        <li><strong>Cliente:</strong> ${appt.client.name}</li>
        <li><strong>Servicio:</strong> ${appt.service.name}</li>
        <li><strong>Fecha y hora:</strong> ${when}</li>
      </ul>`),
  );
}

export async function notifyAppointmentConfirmed(appt: AppointmentForEmail): Promise<void> {
  await send(
    appt.client.email,
    `Tu cita en ${SHOP_NAME} fue confirmada`,
    layout('Cita confirmada ✅', `
      <p>Hola <strong>${appt.client.name}</strong>,</p>
      <p>Tu cita fue confirmada:</p>
      <ul>
        <li><strong>Servicio:</strong> ${appt.service.name}</li>
        <li><strong>Barbero:</strong> ${appt.barber.user.name}</li>
        <li><strong>Fecha y hora:</strong> ${formatDate(appt.startAt)}</li>
      </ul>
      <p>¡Te esperamos!</p>`),
  );
}

export async function notifyAppointmentCancelled(
  appt: AppointmentForEmail,
  cancelledByRole: string,
): Promise<void> {
  const when = formatDate(appt.startAt);
  // Avisamos a la otra parte de la que canceló.
  if (cancelledByRole === 'CLIENT') {
    await send(
      appt.barber.user.email,
      `${appt.client.name} canceló su cita`,
      layout('Cita cancelada', `
        <p>La siguiente cita fue cancelada por el cliente:</p>
        <ul>
          <li><strong>Cliente:</strong> ${appt.client.name}</li>
          <li><strong>Servicio:</strong> ${appt.service.name}</li>
          <li><strong>Fecha y hora:</strong> ${when}</li>
        </ul>`),
    );
  } else {
    await send(
      appt.client.email,
      `Tu cita en ${SHOP_NAME} fue cancelada`,
      layout('Cita cancelada', `
        <p>Hola <strong>${appt.client.name}</strong>,</p>
        <p>Lamentamos informarte que tu cita del <strong>${when}</strong> fue cancelada.</p>
        <p>Podés reservar un nuevo horario cuando quieras.</p>`),
    );
  }
}

export async function notifyAppointmentRescheduled(appt: AppointmentForEmail): Promise<void> {
  const when = formatDate(appt.startAt);
  await send(
    appt.client.email,
    `Tu cita en ${SHOP_NAME} fue reprogramada`,
    layout('Cita reprogramada', `
      <p>Hola <strong>${appt.client.name}</strong>,</p>
      <p>Tu cita fue movida a un nuevo horario:</p>
      <ul>
        <li><strong>Servicio:</strong> ${appt.service.name}</li>
        <li><strong>Barbero:</strong> ${appt.barber.user.name}</li>
        <li><strong>Nueva fecha y hora:</strong> ${when}</li>
      </ul>`),
  );
  await send(
    appt.barber.user.email,
    `${appt.client.name} reprogramó su cita`,
    layout('Cita reprogramada', `
      <p>La cita de <strong>${appt.client.name}</strong> (${appt.service.name}) se movió a <strong>${when}</strong>.</p>`),
  );
}

/** Recordatorio enviado por el job programado (ver reminder.job.ts). */
export async function notifyAppointmentReminder(appt: AppointmentForEmail): Promise<void> {
  await send(
    appt.client.email,
    `Recordatorio: tu cita en ${SHOP_NAME} es mañana`,
    layout('Recordatorio de cita ⏰', `
      <p>Hola <strong>${appt.client.name}</strong>,</p>
      <p>Te recordamos tu próxima cita:</p>
      <ul>
        <li><strong>Servicio:</strong> ${appt.service.name}</li>
        <li><strong>Barbero:</strong> ${appt.barber.user.name}</li>
        <li><strong>Fecha y hora:</strong> ${formatDate(appt.startAt)}</li>
      </ul>
      <p>Si no podés asistir, cancelá o reprogramá con anticipación.</p>`),
  );
}
