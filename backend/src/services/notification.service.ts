import nodemailer, { type Transporter } from 'nodemailer';
import { SHOP_TIMEZONE } from '../lib/timezone';

/**
 * Servicio de notificaciones por email.
 *
 * Es "pluggable": si no hay credenciales SMTP configuradas (SMTP_HOST/SMTP_USER),
 * el servicio no falla — registra el email en consola. Esto permite desarrollar
 * sin un proveedor de correo y activar el envío real en producción solo con
 * variables de entorno.
 *
 * Las plantillas usan tablas y estilos inline a propósito: Gmail y Outlook
 * ignoran flexbox, <style> externos y casi todo el CSS moderno.
 */

const SHOP_NAME = process.env.SHOP_NAME ?? 'Dragón Studio';
const SHOP_ADDRESS = process.env.SHOP_ADDRESS ?? 'Soto Mayor 426, Nueva Imperial';
const SHOP_PHONE = process.env.SHOP_PHONE ?? '+56 9 8298 4323';
const SHOP_EMAIL = process.env.SHOP_EMAIL ?? 'barberdragon7@gmail.com';
const SHOP_INSTAGRAM = process.env.SHOP_INSTAGRAM ?? '';
const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
// PNG (no webp): Outlook de escritorio no muestra webp. Debe ser una URL pública.
const LOGO_URL = process.env.SHOP_LOGO_URL ?? `${FRONTEND_URL}/brand/email-logo.png`;
const FROM = process.env.SMTP_FROM ?? 'no-reply@barberia.app';

const INK = '#111111';
const MUTED = '#6b6760';
const LINE = '#e7e3dc';
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

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

interface Attachment { filename: string; content: string; contentType: string }
type Message = [to: string, subject: string, html: string, attachments?: Attachment[]];

/**
 * Envía varios correos de forma independiente: si uno falla (p. ej. el del
 * cliente rebota) los demás igual salen. Lanza al final si alguno falló, para
 * que quien llama lo registre.
 */
async function sendAll(messages: Message[]): Promise<void> {
  const results = await Promise.allSettled(
    messages.filter(([to]) => Boolean(to)).map((m) => send(...m)),
  );
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed.length) {
    throw new AggregateError(failed.map((f) => f.reason), `${failed.length} de ${results.length} correos fallaron`);
  }
}

async function send(to: string, subject: string, html: string, attachments?: Attachment[]): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    // Modo desarrollo / sin SMTP: dejamos rastro en consola.
    console.log(`[email:skipped] → ${to} | ${subject}`);
    throw new Error('SMTP no configurado: el correo no fue enviado');
  }
  // La versión en texto plano mejora la entrega (menos spam) y la accesibilidad.
  await tx.sendMail({ from: `${SHOP_NAME} <${FROM}>`, to, subject, html, text: htmlToText(html), attachments });
}

// ─── Formato ────────────────────────────────────────────────────────────────

function toDate(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

function formatDay(date: Date | string): string {
  const s = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: SHOP_TIMEZONE,
  }).format(toDate(date));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SHOP_TIMEZONE,
  }).format(toDate(date));
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|title)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => `${label.replace(/<[^>]+>/g, '').trim()} (${href})`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|tr|h1|h2|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*/g, '\n\n')
    .trim();
}

// Forma mínima de la cita que necesitan las notificaciones.
export interface AppointmentForEmail {
  startAt: Date | string;
  endAt?: Date | string;
  client: { name: string; email: string };
  barber: { user: { name: string; email: string } };
  service: { name: string; durationMin?: number; price?: unknown };
}

function safeAppointment(appt: AppointmentForEmail): AppointmentForEmail {
  return { ...appt, client: { ...appt.client, name: escapeHtml(appt.client.name) },
    barber: { user: { ...appt.barber.user, name: escapeHtml(appt.barber.user.name) } },
    service: { ...appt.service, name: escapeHtml(appt.service.name) } };
}

function endOf(appt: AppointmentForEmail): Date {
  if (appt.endAt) return toDate(appt.endAt);
  return new Date(toDate(appt.startAt).getTime() + (appt.service.durationMin ?? 60) * 60_000);
}

// ─── Bloques de plantilla ───────────────────────────────────────────────────

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SHOP_NAME}, ${SHOP_ADDRESS}`)}`;

function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function googleCalendarUrl(appt: AppointmentForEmail, rawServiceName: string): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${rawServiceName} · ${SHOP_NAME}`,
    dates: `${icsStamp(toDate(appt.startAt))}/${icsStamp(endOf(appt))}`,
    location: SHOP_ADDRESS,
    details: `Reserva en ${SHOP_NAME}. Teléfono: ${SHOP_PHONE}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Archivo .ics para Apple Calendar / Outlook (Google usa el botón). */
function icsAttachment(appt: AppointmentForEmail, rawServiceName: string, uid: string): Attachment {
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const content = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${esc(SHOP_NAME)}//Reservas//ES`, 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid.replace(/[^A-Za-z0-9-]/g, '')}@reservas`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(toDate(appt.startAt))}`,
    `DTEND:${icsStamp(endOf(appt))}`,
    `SUMMARY:${esc(`${rawServiceName} · ${SHOP_NAME}`)}`,
    `LOCATION:${esc(SHOP_ADDRESS)}`,
    `DESCRIPTION:${esc(`Teléfono: ${SHOP_PHONE}`)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Recordatorio de tu cita', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return { filename: 'cita.ics', content, contentType: 'text/calendar; charset=utf-8; method=PUBLISH' };
}

function button(href: string, label: string, primary = true): string {
  const style = primary
    ? `background:${INK};color:#ffffff;border:1px solid ${INK};`
    : `background:#ffffff;color:${INK};border:1px solid ${INK};`;
  return `<a href="${href}" target="_blank" style="${style}display:inline-block;padding:12px 22px;border-radius:999px;font-family:${SANS};font-size:14px;font-weight:600;text-decoration:none;margin:4px 6px 4px 0;">${label}</a>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.6;color:${INK};">${html}</p>`;
}

function note(html: string): string {
  return `<p style="margin:18px 0 0;font-family:${SANS};font-size:13px;line-height:1.55;color:${MUTED};">${html}</p>`;
}

/** Tarjeta con fecha grande y tabla de detalles. */
function appointmentCard(appt: AppointmentForEmail, rows: Array<[string, string]>, opts: { struck?: boolean } = {}): string {
  const deco = opts.struck ? 'text-decoration:line-through;' : '';
  const detail = rows
    .filter(([, v]) => v)
    .map(([k, v], i) => `
      <tr>
        <td style="padding:10px 0;${i ? `border-top:1px solid ${LINE};` : ''}font-family:${SANS};font-size:13px;color:${MUTED};width:38%;">${k}</td>
        <td style="padding:10px 0;${i ? `border-top:1px solid ${LINE};` : ''}font-family:${SANS};font-size:14px;color:${INK};font-weight:600;text-align:right;">${v}</td>
      </tr>`)
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 22px;border:1px solid ${LINE};border-radius:14px;">
      <tr><td style="padding:20px 22px 6px;">
        <div style="font-family:${SANS};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">Fecha y hora</div>
        <div style="margin-top:6px;font-family:${SERIF};font-size:24px;line-height:1.25;color:${INK};${deco}">${formatDay(appt.startAt)}</div>
        <div style="margin-top:2px;font-family:${SANS};font-size:17px;color:${INK};${deco}">${formatTime(appt.startAt)} – ${formatTime(endOf(appt))} hrs</div>
      </td></tr>
      <tr><td style="padding:8px 22px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detail}</table>
      </td></tr>
    </table>`;
}

function serviceRows(appt: AppointmentForEmail, who: 'barber' | 'client'): Array<[string, string]> {
  const price = appt.service.price != null ? CLP.format(Number(appt.service.price)) : '';
  return [
    ['Servicio', appt.service.name],
    who === 'barber' ? ['Barbero', appt.barber.user.name] : ['Cliente', appt.client.name],
    ['Duración', appt.service.durationMin ? `${appt.service.durationMin} min` : ''],
    ['Precio', price],
  ];
}

function layout(title: string, body: string, preheader = ''): string {
  const tel = SHOP_PHONE.replace(/[^\d+]/g, '');
  const ig = SHOP_INSTAGRAM.replace(/^@/, '');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;">
        <tr><td align="center" style="background:${INK};padding:28px 24px 22px;">
          <img src="${LOGO_URL}" width="76" height="76" alt="${escapeHtml(SHOP_NAME)}" style="display:block;width:76px;height:76px;border-radius:50%;background:#ffffff;border:0;">
          <div style="margin-top:12px;font-family:${SERIF};font-size:15px;letter-spacing:4px;text-transform:uppercase;color:#ffffff;">${escapeHtml(SHOP_NAME)}</div>
        </td></tr>
        <tr><td style="padding:32px 32px 30px;">
          <h1 style="margin:0 0 18px;font-family:${SERIF};font-size:28px;font-weight:normal;line-height:1.2;color:${INK};">${title}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:22px 32px 26px;background:#faf9f6;border-top:1px solid ${LINE};font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTED};">
          <strong style="color:${INK};">${escapeHtml(SHOP_NAME)}</strong><br>
          <a href="${mapsUrl}" style="color:${MUTED};">${escapeHtml(SHOP_ADDRESS)}</a><br>
          <a href="tel:${tel}" style="color:${MUTED};">${escapeHtml(SHOP_PHONE)}</a> · <a href="mailto:${SHOP_EMAIL}" style="color:${MUTED};">${escapeHtml(SHOP_EMAIL)}</a>${ig ? ` · <a href="https://instagram.com/${encodeURIComponent(ig)}" style="color:${MUTED};">@${escapeHtml(ig)}</a>` : ''}<br>
          <span style="color:#a29d94;">Este es un mensaje automático, no es necesario responder.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Correos de citas ───────────────────────────────────────────────────────

export async function notifyAppointmentCreated(appt: AppointmentForEmail): Promise<void> {
  const rawService = appt.service.name;
  appt = safeAppointment(appt);
  const when = `${formatDay(appt.startAt)}, ${formatTime(appt.startAt)} hrs`;
  await sendAll([
    // Al cliente
    [
      appt.client.email,
      `Cita confirmada: ${formatDay(appt.startAt).toLowerCase()} a las ${formatTime(appt.startAt)}`,
      layout('Tu cita está confirmada', `
        ${paragraph(`Hola <strong>${appt.client.name}</strong>, te esperamos en ${escapeHtml(SHOP_NAME)}.`)}
        ${appointmentCard(appt, serviceRows(appt, 'barber'))}
        <div>
          ${button(googleCalendarUrl(appt, rawService), 'Agregar al calendario')}
          ${button(mapsUrl, 'Cómo llegar', false)}
        </div>
        ${note(`¿Necesitas cancelar o cambiar la hora? Hazlo con al menos 2 horas de antelación o escríbenos al <a href="tel:${SHOP_PHONE.replace(/[^\d+]/g, '')}" style="color:${INK};">${escapeHtml(SHOP_PHONE)}</a>. Adjuntamos el archivo <em>cita.ics</em> para Apple Calendar u Outlook.`)}`,
        `${appt.service.name} con ${appt.barber.user.name} · ${when}`),
      [icsAttachment(appt, rawService, `${icsStamp(toDate(appt.startAt))}-${appt.client.email}`)],
    ],
    // Al barbero
    [
      appt.barber.user.email,
      `Nueva reserva: ${appt.client.name} · ${formatDay(appt.startAt)} ${formatTime(appt.startAt)}`,
      layout('Nueva reserva', `
        ${paragraph('Tienes una nueva cita confirmada en tu agenda.')}
        ${appointmentCard(appt, serviceRows(appt, 'client'))}
        ${button(`${FRONTEND_URL}/dashboard/barber`, 'Ver mi agenda')}`,
        `${appt.client.name} · ${appt.service.name} · ${when}`),
    ],
  ]);
}

export async function notifyAppointmentConfirmed(appt: AppointmentForEmail): Promise<void> {
  const rawService = appt.service.name;
  appt = safeAppointment(appt);
  await send(
    appt.client.email,
    `Tu cita en ${SHOP_NAME} fue confirmada`,
    layout('Cita confirmada', `
      ${paragraph(`Hola <strong>${appt.client.name}</strong>, tu cita fue confirmada. ¡Te esperamos!`)}
      ${appointmentCard(appt, serviceRows(appt, 'barber'))}
      <div>
        ${button(googleCalendarUrl(appt, rawService), 'Agregar al calendario')}
        ${button(mapsUrl, 'Cómo llegar', false)}
      </div>`,
      `${appt.service.name} · ${formatDay(appt.startAt)}, ${formatTime(appt.startAt)} hrs`),
  );
}

export async function notifyAppointmentCancelled(
  appt: AppointmentForEmail,
  cancelledByRole: string,
): Promise<void> {
  appt = safeAppointment(appt);
  // Avisamos a la otra parte de la que canceló.
  if (cancelledByRole === 'CLIENT') {
    await send(
      appt.barber.user.email,
      `${appt.client.name} canceló su cita`,
      layout('Cita cancelada', `
        ${paragraph(`<strong>${appt.client.name}</strong> canceló la siguiente cita. El horario quedó libre en tu agenda.`)}
        ${appointmentCard(appt, serviceRows(appt, 'client'), { struck: true })}
        ${button(`${FRONTEND_URL}/dashboard/barber`, 'Ver mi agenda')}`,
        `${appt.client.name} canceló · ${formatDay(appt.startAt)}, ${formatTime(appt.startAt)} hrs`),
    );
  } else {
    await send(
      appt.client.email,
      `Tu cita en ${SHOP_NAME} fue cancelada`,
      layout('Tu cita fue cancelada', `
        ${paragraph(`Hola <strong>${appt.client.name}</strong>, lamentamos avisarte que tu cita fue cancelada por la barbería.`)}
        ${appointmentCard(appt, serviceRows(appt, 'barber'), { struck: true })}
        ${paragraph('Puedes reservar otro horario cuando quieras:')}
        ${button(`${FRONTEND_URL}/barbers`, 'Reservar nueva hora')}
        ${note('Disculpa las molestias. Si tienes dudas, contáctanos a los datos de abajo.')}`,
        `Tu cita del ${formatDay(appt.startAt)} fue cancelada`),
    );
  }
}

export async function notifyAppointmentRescheduled(appt: AppointmentForEmail): Promise<void> {
  const rawService = appt.service.name;
  appt = safeAppointment(appt);
  const when = `${formatDay(appt.startAt)}, ${formatTime(appt.startAt)} hrs`;
  await sendAll([
    [
      appt.client.email,
      `Tu cita en ${SHOP_NAME} fue reprogramada`,
      layout('Cita reprogramada', `
        ${paragraph(`Hola <strong>${appt.client.name}</strong>, tu cita tiene un nuevo horario:`)}
        ${appointmentCard(appt, serviceRows(appt, 'barber'))}
        <div>
          ${button(googleCalendarUrl(appt, rawService), 'Actualizar calendario')}
          ${button(mapsUrl, 'Cómo llegar', false)}
        </div>`,
        `Nuevo horario: ${when}`),
      [icsAttachment(appt, rawService, `${icsStamp(toDate(appt.startAt))}-${appt.client.email}`)],
    ],
    [
      appt.barber.user.email,
      `${appt.client.name} reprogramó su cita`,
      layout('Cita reprogramada', `
        ${paragraph(`La cita de <strong>${appt.client.name}</strong> se movió a un nuevo horario:`)}
        ${appointmentCard(appt, serviceRows(appt, 'client'))}
        ${button(`${FRONTEND_URL}/dashboard/barber`, 'Ver mi agenda')}`,
        `${appt.client.name} · ${when}`),
    ],
  ]);
}

/** Recordatorio enviado por el job programado (ver reminder.job.ts). */
export async function notifyAppointmentReminder(appt: AppointmentForEmail): Promise<void> {
  appt = safeAppointment(appt);
  await send(
    appt.client.email,
    `Recordatorio: tu cita es el ${formatDay(appt.startAt).toLowerCase()} a las ${formatTime(appt.startAt)}`,
    layout('Te esperamos pronto', `
      ${paragraph(`Hola <strong>${appt.client.name}</strong>, te recordamos tu próxima cita:`)}
      ${appointmentCard(appt, serviceRows(appt, 'barber'))}
      ${button(mapsUrl, 'Cómo llegar')}
      ${note(`Si no puedes asistir, avísanos al <a href="tel:${SHOP_PHONE.replace(/[^\d+]/g, '')}" style="color:${INK};">${escapeHtml(SHOP_PHONE)}</a> para liberar la hora.`)}`,
      `${appt.service.name} · ${formatDay(appt.startAt)}, ${formatTime(appt.startAt)} hrs`),
  );
}

// ─── Cuenta ─────────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  await send(
    to,
    `Restablece tu contraseña de ${SHOP_NAME}`,
    layout('Restablecer contraseña', `
      ${paragraph(`Hola <strong>${escapeHtml(name)}</strong>,`)}
      ${paragraph('Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para elegir una nueva:')}
      <div style="margin:22px 0;">${button(resetUrl, 'Restablecer contraseña')}</div>
      ${note('Este enlace vence en 1 hora. Si no solicitaste el cambio, ignora este correo: tu contraseña actual sigue siendo válida.')}`,
      'Elige una nueva contraseña'),
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
      ${paragraph(`Hola <strong>${escapeHtml(name)}</strong>, ¡gracias por registrarte!`)}
      ${paragraph('Confirma tu dirección de email para activar todas las funciones de tu cuenta:')}
      <div style="margin:22px 0;">${button(verifyUrl, 'Confirmar email')}</div>
      ${note('Este enlace vence en 24 horas.')}`,
      'Activa tu cuenta con un clic'),
  );
}
