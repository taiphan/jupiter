import type { User } from './auth-store';

export type AuthApiUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: User['role'];
  avatarColor: string;
  title: string;
  emailVerified: boolean;
};

export function mapAuthApiUser(raw: AuthApiUser): User {
  return {
    id: raw.id,
    username: raw.username,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    avatarColor: raw.avatarColor,
    title: raw.title,
    emailVerified: raw.emailVerified,
  };
}

/** null = API up, no session; undefined = API unavailable (client-only mode). */
export type OAuthProviderId = 'google' | 'microsoft' | 'github';

export type SessionPayload = {
  user: AuthApiUser | null;
  oauthConnected?: OAuthProviderId[];
  hasPassword?: boolean;
  googleConnected?: boolean;
  googleAuthAvailable?: boolean;
  microsoftAuthAvailable?: boolean;
  githubAuthAvailable?: boolean;
  totpEnabled?: boolean;
  twoFactorAuthAvailable?: boolean;
};

export async function fetchSession(): Promise<
  | { mode: 'offline' }
  | { mode: 'none' }
  | {
      mode: 'ok';
      user: User;
      oauthConnected: OAuthProviderId[];
      hasPassword: boolean;
      googleConnected: boolean;
      googleAuthAvailable: boolean;
      microsoftAuthAvailable: boolean;
      githubAuthAvailable: boolean;
      totpEnabled: boolean;
      twoFactorAuthAvailable: boolean;
    }
> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (res.status === 503) return { mode: 'offline' };
    if (!res.ok) return { mode: 'none' };
    const data = (await res.json()) as SessionPayload;
    if (!data.user) return { mode: 'none' };
    return {
      mode: 'ok',
      user: mapAuthApiUser(data.user),
      oauthConnected: data.oauthConnected ?? [],
      hasPassword: Boolean(data.hasPassword),
      googleConnected: Boolean(data.googleConnected),
      googleAuthAvailable: Boolean(data.googleAuthAvailable),
      microsoftAuthAvailable: Boolean(data.microsoftAuthAvailable),
      githubAuthAvailable: Boolean(data.githubAuthAvailable),
      totpEnabled: Boolean(data.totpEnabled),
      twoFactorAuthAvailable: Boolean(data.twoFactorAuthAvailable),
    };
  } catch {
    return { mode: 'offline' };
  }
}

export async function fetchSessionUser(): Promise<User | null | undefined> {
  const session = await fetchSession();
  if (session.mode === 'offline') return undefined;
  if (session.mode === 'none') return null;
  return session.user;
}

export async function disconnectOAuthViaApi(
  provider: OAuthProviderId,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/auth/oauth/${provider}/disconnect`, {
    method: 'POST',
    credentials: 'same-origin',
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Disconnect failed' };
  return { ok: true };
}

/** @deprecated use disconnectOAuthViaApi('google') */
export async function disconnectGoogleViaApi(): Promise<{ ok: boolean; error?: string }> {
  return disconnectOAuthViaApi('google');
}

export async function fetchAuthConfig(): Promise<{
  emailAuth: boolean;
  googleAuth: boolean;
  microsoftAuth: boolean;
  githubAuth: boolean;
  twoFactorAuth?: boolean;
} | null> {
  try {
    const res = await fetch('/api/auth/config', { credentials: 'same-origin' });
    if (!res.ok) return null;
    return (await res.json()) as {
      emailAuth: boolean;
      googleAuth: boolean;
      microsoftAuth: boolean;
      githubAuth: boolean;
      twoFactorAuth?: boolean;
    };
  } catch {
    return null;
  }
}

export type SessionListItem = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export async function fetchSessionsViaApi(): Promise<SessionListItem[]> {
  const res = await fetch('/api/auth/sessions', { credentials: 'same-origin' });
  if (!res.ok) return [];
  const data = (await res.json()) as { sessions?: SessionListItem[] };
  return data.sessions ?? [];
}

export async function revokeSessionViaApi(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/auth/sessions/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Could not revoke session' };
  return { ok: true };
}

export async function revokeAllOtherSessionsViaApi(): Promise<{ ok: boolean; revoked?: number }> {
  const res = await fetch('/api/auth/sessions/revoke-all', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!res.ok) return { ok: false };
  const data = (await res.json()) as { revoked?: number };
  return { ok: true, revoked: data.revoked };
}

export type ApiTokenListItem = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

export async function fetchApiTokensViaApi(): Promise<ApiTokenListItem[]> {
  const res = await fetch('/api/auth/tokens', { credentials: 'same-origin' });
  if (!res.ok) return [];
  const data = (await res.json()) as { tokens?: ApiTokenListItem[] };
  return data.tokens ?? [];
}

export async function createApiTokenViaApi(
  name: string,
  expiresInDays?: number,
): Promise<{ ok: true; token: ApiTokenListItem; secret: string } | { ok: false; error: string }> {
  const res = await fetch('/api/auth/tokens', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, expiresInDays }),
  });
  const data = (await res.json()) as {
    token?: ApiTokenListItem;
    secret?: string;
    error?: string;
  };
  if (!res.ok || !data.token || !data.secret) {
    return { ok: false, error: data.error ?? 'Could not create token' };
  }
  return { ok: true, token: data.token, secret: data.secret };
}

export async function revokeApiTokenViaApi(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/auth/tokens/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Could not revoke token' };
  return { ok: true };
}

export async function setPasswordViaApi(
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/password/set', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Could not set password' };
  return { ok: true };
}

export async function loginViaApi(
  email: string,
  password: string,
): Promise<
  | { ok: true; user: User }
  | { ok: true; requires2fa: true }
  | { ok: false; error: string }
  | { ok: false; unavailable: true }
> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 503) return { ok: false, unavailable: true };
    const data = (await res.json()) as {
      user?: AuthApiUser;
      requires2fa?: boolean;
      error?: string;
    };
    if (!res.ok) return { ok: false, error: data.error ?? 'Login failed' };
    if (data.requires2fa) return { ok: true, requires2fa: true };
    if (!data.user) return { ok: false, error: 'Login failed' };
    return { ok: true, user: mapAuthApiUser(data.user) };
  } catch {
    return { ok: false, unavailable: true };
  }
}

export async function challenge2faViaApi(
  input: { code: string } | { backupCode: string },
): Promise<
  | { ok: true; user: User }
  | { ok: false; error: string }
> {
  const res = await fetch('/api/auth/2fa/challenge', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { user?: AuthApiUser; error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Verification failed' };
  if (!data.user) return { ok: false, error: 'Verification failed' };
  return { ok: true, user: mapAuthApiUser(data.user) };
}

export async function setup2faViaApi(): Promise<
  | {
      ok: true;
      otpauthUrl: string;
      secretMasked: string;
      qrDataUrl: string;
      manualKey: string;
    }
  | { ok: false; error: string }
> {
  const res = await fetch('/api/auth/2fa/setup', {
    method: 'POST',
    credentials: 'same-origin',
  });
  const data = (await res.json()) as {
    otpauthUrl?: string;
    secretMasked?: string;
    qrDataUrl?: string;
    manualKey?: string;
    error?: string;
  };
  if (!res.ok || !data.qrDataUrl || !data.manualKey) {
    return { ok: false, error: data.error ?? 'Could not start 2FA setup' };
  }
  return {
    ok: true,
    otpauthUrl: data.otpauthUrl ?? '',
    secretMasked: data.secretMasked ?? '',
    qrDataUrl: data.qrDataUrl,
    manualKey: data.manualKey,
  };
}

export async function enable2faViaApi(
  code: string,
): Promise<{ ok: true; backupCodes: string[] } | { ok: false; error: string }> {
  const res = await fetch('/api/auth/2fa/enable', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = (await res.json()) as { backupCodes?: string[]; error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Could not enable 2FA' };
  return { ok: true, backupCodes: data.backupCodes ?? [] };
}

export async function disable2faViaApi(input: {
  password: string;
  code?: string;
  backupCode?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/2fa/disable', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Could not disable 2FA' };
  return { ok: true };
}

export async function regenerateBackupCodesViaApi(
  password: string,
  code: string,
): Promise<{ ok: true; backupCodes: string[] } | { ok: false; error: string }> {
  const res = await fetch('/api/auth/2fa/backup-codes/regenerate', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, code }),
  });
  const data = (await res.json()) as { backupCodes?: string[]; error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Could not regenerate codes' };
  return { ok: true, backupCodes: data.backupCodes ?? [] };
}

export async function registerViaApi(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { message?: string; error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Registration failed' };
  return { ok: true, message: data.message ?? 'Check your email to verify your account.' };
}

export async function resendVerificationViaApi(
  email: string,
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('/api/auth/resend-verification', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json()) as { message?: string };
  return { ok: res.ok, message: data.message ?? 'Request sent.' };
}

export async function forgotPasswordViaApi(email: string): Promise<{ message: string }> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json()) as { message?: string };
  return { message: data.message ?? 'If an account exists, we sent instructions.' };
}

export async function resetPasswordViaApi(
  token: string,
  password: string,
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = (await res.json()) as { message?: string; error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Reset failed' };
  return { ok: true, message: data.message };
}

export async function logoutViaApi(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    // Best-effort when API is down.
  }
}
