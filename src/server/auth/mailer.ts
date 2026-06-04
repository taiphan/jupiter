import { getAppUrl } from './config';

export type MailKind = 'verify_email' | 'password_reset';

export async function sendAuthEmail(
  to: string,
  kind: MailKind,
  token: string,
): Promise<void> {
  const appUrl = getAppUrl();
  const path =
    kind === 'verify_email'
      ? `/api/auth/verify?token=${encodeURIComponent(token)}`
      : `/reset-password?token=${encodeURIComponent(token)}`;
  const link = `${appUrl}${path}`;
  const subject =
    kind === 'verify_email' ? 'Verify your Jupiter email' : 'Reset your Jupiter password';

  const provider = process.env.EMAIL_PROVIDER ?? 'console';

  if (provider === 'smtp' && process.env.SMTP_URL) {
    console.log(
      `[jupiter-mail] SMTP not wired yet (set EMAIL_PROVIDER=console). ${subject} → ${to}\n  ${link}`,
    );
    return;
  }

  console.log(`[jupiter-mail] ${subject} → ${to}\n  ${link}`);
}
