import type { MailKind } from './mailer';

export type AuthEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildAuthEmail(kind: MailKind, token: string, appUrl: string): AuthEmailContent {
  const path =
    kind === 'verify_email'
      ? `/api/auth/verify?token=${encodeURIComponent(token)}`
      : `/reset-password?token=${encodeURIComponent(token)}`;
  const link = `${appUrl}${path}`;

  if (kind === 'verify_email') {
    return {
      subject: 'Verify your Jupiter account',
      text: [
        'Welcome to Jupiter.',
        '',
        'Confirm your email address by opening this link (valid for 24 hours):',
        link,
        '',
        'If you did not create an account, you can ignore this message.',
      ].join('\n'),
      html: `
        <p>Welcome to Jupiter.</p>
        <p>Confirm your email address:</p>
        <p><a href="${link}">Verify your email</a></p>
        <p>Or copy this link into your browser:<br/><a href="${link}">${link}</a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create an account, you can ignore this message.</p>
      `.trim(),
    };
  }

  return {
    subject: 'Reset your Jupiter password',
    text: [
      'We received a request to reset your Jupiter password.',
      '',
      'Open this link to choose a new password (valid for 1 hour):',
      link,
      '',
      'If you did not request a reset, you can ignore this message.',
    ].join('\n'),
    html: `
      <p>We received a request to reset your Jupiter password.</p>
      <p><a href="${link}">Reset your password</a></p>
      <p>Or copy this link into your browser:<br/><a href="${link}">${link}</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request a reset, you can ignore this message.</p>
    `.trim(),
  };
}
