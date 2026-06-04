export type AuthSettingsForm = {
  appUrl: string;
  emailProvider: 'console' | 'gmail' | 'smtp';
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  emailFrom: string;
  mailRedirectTo: string;
  testEmailTo: string;
  googleAuthEnabled: boolean;
  googleClientId: string;
  googleAllowedHd: string;
  twoFactorEnabled: boolean;
  microsoftAuthEnabled: boolean;
  microsoftClientId: string;
  microsoftTenantId: string;
  githubAuthEnabled: boolean;
  githubClientId: string;
  hasSmtpPassword: boolean;
  hasGoogleClientSecret: boolean;
  hasMicrosoftClientSecret: boolean;
  hasGithubClientSecret: boolean;
};

export async function fetchAuthSettingsAdmin(): Promise<
  { ok: true; settings: AuthSettingsForm } | { ok: false; error: string }
> {
  const res = await fetch('/api/admin/auth-settings', { credentials: 'same-origin' });
  const data = (await res.json()) as AuthSettingsForm & { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Failed to load settings' };
  return { ok: true, settings: data };
}

export async function saveAuthSettingsAdmin(
  patch: Partial<AuthSettingsForm> & {
    smtpPass?: string;
    googleClientSecret?: string;
    microsoftClientSecret?: string;
    githubClientSecret?: string;
    clearSmtpPass?: boolean;
    clearGoogleClientSecret?: boolean;
    clearMicrosoftClientSecret?: boolean;
    clearGithubClientSecret?: boolean;
  },
): Promise<{ ok: true; settings: AuthSettingsForm } | { ok: false; error: string }> {
  const res = await fetch('/api/admin/auth-settings', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = (await res.json()) as AuthSettingsForm & { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Failed to save settings' };
  return { ok: true, settings: data };
}

export async function sendTestAuthEmailAdmin(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('/api/admin/auth-settings', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'test-email' }),
  });
  const data = (await res.json()) as { message?: string; error?: string };
  if (!res.ok) return { ok: false, message: data.error ?? 'Test email failed' };
  return { ok: true, message: data.message ?? 'Test email sent.' };
}
