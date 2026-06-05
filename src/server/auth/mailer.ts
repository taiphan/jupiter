import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { buildAuthEmail } from './mail-templates';
import { getAuthSettings } from './auth-settings';
import type { ResolvedAuthSettings } from './auth-settings-types';

export type MailKind = 'verify_email' | 'password_reset';

export class MailDeliveryError extends Error {
  constructor(message = 'Email delivery failed') {
    super(message);
    this.name = 'MailDeliveryError';
  }
}

let cachedTransport: nodemailer.Transporter | null | undefined;

export function resetMailerCache(): void {
  cachedTransport = undefined;
}

function resolveFromAddress(settings: ResolvedAuthSettings): string {
  const from = settings.emailFrom.trim();
  if (from.includes('<')) return from;
  if (from.includes('@')) return `Jupiter <${from}>`;
  return 'Jupiter <noreply@localhost>';
}

function buildTransportOptions(settings: ResolvedAuthSettings): SMTPTransport.Options | null {
  if (settings.emailProvider === 'console') return null;

  const host =
    settings.smtpHost ||
    (settings.emailProvider === 'gmail' ? 'smtp.gmail.com' : undefined);
  const user = settings.smtpUser?.trim();
  const pass = settings.smtpPass?.replace(/\s/g, '');

  if (!host || !user || !pass) return null;

  const port = settings.smtpPort || (settings.emailProvider === 'gmail' ? 587 : 587);
  const secure = settings.smtpSecure || port === 465;

  return { host, port, secure, auth: { user, pass } };
}

async function getTransport(): Promise<nodemailer.Transporter | null> {
  if (cachedTransport !== undefined) return cachedTransport;
  const settings = await getAuthSettings();
  const options = buildTransportOptions(settings);
  if (!options) {
    cachedTransport = null;
    return null;
  }
  cachedTransport = nodemailer.createTransport(options);
  return cachedTransport;
}

export async function sendAuthEmail(
  to: string,
  kind: MailKind,
  token: string,
): Promise<void> {
  const settings = await getAuthSettings();
  const { subject, text, html } = buildAuthEmail(kind, token, settings.appUrl);

  let recipient = to;
  if (settings.mailRedirectTo) {
    recipient = settings.mailRedirectTo;
  }

  const transport = await getTransport();

  if (!transport) {
    const linkLine = text.split('\n').find((line) => line.startsWith('http'));
    const redirectNote =
      settings.mailRedirectTo && settings.mailRedirectTo !== to
        ? ` (intended for ${to})`
        : '';
    console.log(`[jupiter-mail] ${subject} → ${recipient}${redirectNote}\n  ${linkLine ?? ''}`);
    return;
  }

  try {
    const originalNote =
      settings.mailRedirectTo && settings.mailRedirectTo !== to
        ? `\n\n[Intended recipient: ${to}]`
        : '';

    await transport.sendMail({
      from: resolveFromAddress(settings),
      to: recipient,
      subject,
      text: text + originalNote,
      html: html + (originalNote ? `<p><em>Intended recipient: ${to}</em></p>` : ''),
    });
  } catch (err) {
    console.error('[jupiter-mail] SMTP send failed:', err instanceof Error ? err.message : err);
    throw new MailDeliveryError();
  }
}

export async function sendTestAuthEmail(): Promise<void> {
  const settings = await getAuthSettings();
  await sendAuthEmail(settings.testEmailTo, 'verify_email', 'test-token-not-valid');
}

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<void> {
  const settings = await getAuthSettings();
  let recipient = to;
  if (settings.mailRedirectTo) {
    recipient = settings.mailRedirectTo;
  }

  const transport = await getTransport();

  if (!transport) {
    const redirectNote =
      settings.mailRedirectTo && settings.mailRedirectTo !== to
        ? ` (intended for ${to})`
        : '';
    console.log(`[jupiter-mail] ${subject} → ${recipient}${redirectNote}\n  ${text.slice(0, 200)}`);
    return;
  }

  try {
    const originalNote =
      settings.mailRedirectTo && settings.mailRedirectTo !== to
        ? `\n\n[Intended recipient: ${to}]`
        : '';

    await transport.sendMail({
      from: resolveFromAddress(settings),
      to: recipient,
      subject,
      text: text + originalNote,
      html: html + (originalNote ? `<p><em>Intended recipient: ${to}</em></p>` : ''),
    });
  } catch (err) {
    console.error('[jupiter-mail] SMTP send failed:', err instanceof Error ? err.message : err);
    throw new MailDeliveryError();
  }
}
