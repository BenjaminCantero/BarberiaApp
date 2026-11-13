import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Servicio de notificaciones por email.
 *
 * Es "pluggable": si no hay credenciales SMTP configuradas (SMTP_HOST/SMTP_USER),
 * el servicio no falla — registra el email en consola. Esto permite desarrollar
 * sin un proveedor de correo y activar el envío real en producción solo con
 * variables de entorno.
 */

import { SHOP_TIMEZONE } from '../lib/timezone';

const SHOP_NAME = process.env.SHOP_NAME ?? 'Barbería';
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

/**
 * Envía varios correos de forma independiente: si uno falla (p. ej. el del
 * cliente rebota) los demás igual salen. Lanza al final si alguno falló, para
 * que quien llama lo registre.
 */
async function sendAll(messages: Array<[to: string, subject: string, html: string]>): Promise<void> {
  const results = await Promise.allSettled(
    messages.filter(([to]) => Boolean(to)).map(([to, subject, html]) => send(to, subject, html)),
  );
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed.length) {
    throw new AggregateError(failed.map((f) => f.reason), `${failed.length} de ${results.length} correos fallaron`);
  }
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    // Modo desarrollo / sin SMTP: dejamos rastro en consola.
    console.log(`[email:skipped] → ${to} | ${subject}`);
    throw new Error('SMTP no configurado: el correo no fue enviado');
  }
  await tx.sendMail({ from: `${SHOP_NAME} <${FROM}>`, to, subject, html });
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SHOP_TIMEZONE,
  }).format(d);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function safeAppointment(appt: AppointmentForEmail): AppointmentForEmail {
  return { ...appt, client: { ...appt.client, name: escapeHtml(appt.client.name) },
    barber: { user: { ...appt.barber.user, name: escapeHtml(appt.barber.user.name) } },
    service: { name: escapeHtml(appt.service.name) } };
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
  appt = safeAppointment(appt);
  const when = formatDate(appt.startAt);
  await sendAll([
    // Al cliente
    [
      appt.client.email,
      `Tu cita en ${SHOP_NAME} está confirmada`,
      layout('Reserva confirmada', `
        <p>Hola <strong>${appt.client.name}</strong>,</p>
        <p>Tu cita quedó confirmada:</p>
        <ul>
          <li><strong>Servicio:</strong> ${appt.service.name}</li>
          <li><strong>Barbero:</strong> ${appt.barber.user.name}</li>
          <li><strong>Fecha y hora:</strong> ${when}</li>
        </ul>
        <p>Si necesitas cancelar o reprogramar, hazlo con al menos 2 horas de antelación.</p>`),
    ],
    // Al barbero
    [
      appt.barber.user.email,
      `Nueva reserva de ${appt.client.name}`,
      layout('Nueva reserva', `
        <p>Tienes una nueva cita confirmada:</p>
        <ul>
          <li><strong>Cliente:</strong> ${appt.client.name}</li>
          <li><strong>Servicio:</strong> ${appt.service.name}</li>
          <li><strong>Fecha y hora:</strong> ${when}</li>
        </ul>`),
    ],
  ]);
}

export async function notifyAppointmentConfirmed(appt: AppointmentForEmail): Promise<void> {
  appt = safeAppointment(appt);
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
  appt = safeAppointment(appt);
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
        <p>Puedes reservar un nuevo horario cuando quieras.</p>`),
    );
  }
}

export async function notifyAppointmentRescheduled(appt: AppointmentForEmail): Promise<void> {
  appt = safeAppointment(appt);
  const when = formatDate(appt.startAt);
  await sendAll([
    [
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
    ],
    [
      appt.barber.user.email,
      `${appt.client.name} reprogramó su cita`,
      layout('Cita reprogramada', `
        <p>La cita de <strong>${appt.client.name}</strong> (${appt.service.name}) se movió a <strong>${when}</strong>.</p>`),
    ],
  ]);
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  await send(
    to,
    `Restablece tu contraseña de ${SHOP_NAME}`,
    layout('Restablecer contraseña', `
      <p>Hola <strong>${name}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para elegir una nueva:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Restablecer contraseña</a>
      </p>
      <p style="font-size:13px;color:#6b7280;">Este enlace vence en 1 hora. Si no solicitaste el cambio, ignora este correo: tu contraseña actual sigue siendo válida.</p>`),
  );
}

export async function sendEmailVerificationEmail(
  to: string,
  name: string,
  verifyUrl: string,
): Promise<void> {
  await send(
    to,
    `Confirma tu email en ${SHOP_NAME}`,
    layout('Confirma tu cuenta', `
      <p>Hola <strong>${name}</strong>,</p>
      <p>¡Gracias por registrarte! Confirma tu dirección de email para activar todas las funciones de tu cuenta:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${verifyUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Confirmar email</a>
      </p>
      <p style="font-size:13px;color:#6b7280;">Este enlace vence en 24 horas.</p>`),
  );
}

/** Recordatorio enviado por el job programado (ver reminder.job.ts). */
export async function notifyAppointmentReminder(appt: AppointmentForEmail): Promise<void> {
  appt = safeAppointment(appt);
  await send(
    appt.client.email,
    `Recordatorio de tu próxima cita en ${SHOP_NAME}`,
    layout('Recordatorio de cita ⏰', `
      <p>Hola <strong>${appt.client.name}</strong>,</p>
      <p>Te recordamos tu próxima cita:</p>
      <ul>
        <li><strong>Servicio:</strong> ${appt.service.name}</li>
        <li><strong>Barbero:</strong> ${appt.barber.user.name}</li>
        <li><strong>Fecha y hora:</strong> ${formatDate(appt.startAt)}</li>
      </ul>
      <p>Si no puedes asistir, contacta directamente a la barbería para cancelar o cambiar tu hora.</p>`),
  );
}
