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
export type SessionPayload = {
  user: AuthApiUser | null;
  googleConnected?: boolean;
  googleAuthAvailable?: boolean;
};

export async function fetchSession(): Promise<
  | { mode: 'offline' }
  | { mode: 'none' }
  | { mode: 'ok'; user: User; googleConnected: boolean; googleAuthAvailable: boolean }
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
      googleConnected: Boolean(data.googleConnected),
      googleAuthAvailable: Boolean(data.googleAuthAvailable),
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

export async function disconnectGoogleViaApi(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/google/disconnect', {
    method: 'POST',
    credentials: 'same-origin',
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? 'Disconnect failed' };
  return { ok: true };
}

export async function fetchAuthConfig(): Promise<{
  emailAuth: boolean;
  googleAuth: boolean;
} | null> {
  try {
    const res = await fetch('/api/auth/config', { credentials: 'same-origin' });
    if (!res.ok) return null;
    return (await res.json()) as { emailAuth: boolean; googleAuth: boolean };
  } catch {
    return null;
  }
}

export async function loginViaApi(
  email: string,
  password: string,
): Promise<
  | { ok: true; user: User }
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
    const data = (await res.json()) as { user?: AuthApiUser; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? 'Login failed' };
    if (!data.user) return { ok: false, error: 'Login failed' };
    return { ok: true, user: mapAuthApiUser(data.user) };
  } catch {
    return { ok: false, unavailable: true };
  }
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
