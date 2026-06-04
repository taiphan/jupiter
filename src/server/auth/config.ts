import { resolveAppUrl, resolveDatabaseUrl } from '@/server/env';
import { getAuthSettings } from './auth-settings';
import { getLoginAuthConfig } from './login-config';

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? resolveDatabaseUrl();
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET or DATABASE_URL must be set in production');
  }
  return secret ?? 'jupiter-dev-auth-secret';
}

/** @deprecated sync fallback — prefer getAppUrlAsync */
export function getAppUrl(): string {
  return resolveAppUrl();
}

export async function getAppUrlAsync(): Promise<string> {
  return (await getAuthSettings()).appUrl;
}

export async function isGoogleAuthEnabled(): Promise<boolean> {
  const cfg = await getLoginAuthConfig();
  return cfg.googleAuth;
}

export async function getGoogleClientId(): Promise<string | undefined> {
  const id = (await getAuthSettings()).googleClientId;
  return id || undefined;
}

export async function isTwoFactorEnabled(): Promise<boolean> {
  return (await getAuthSettings()).twoFactorEnabled;
}

export async function isMicrosoftAuthEnabled(): Promise<boolean> {
  const cfg = await getLoginAuthConfig();
  return cfg.microsoftAuth;
}

export async function isGitHubAuthEnabled(): Promise<boolean> {
  const cfg = await getLoginAuthConfig();
  return cfg.githubAuth;
}

export { getLoginAuthConfig };
