import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { sanitizePostAuthRedirect } from '../redirect';
import type { OAuthProviderId } from './types';

function cookieName(provider: OAuthProviderId, suffix: string): string {
  return `jupiter_oauth_${provider}_${suffix}`;
}

export function base64Url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function pkceChallenge(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest());
}

export async function setOAuthCookies(
  provider: OAuthProviderId,
  state: string,
  verifier: string,
  redirectAfter?: string | null,
): Promise<void> {
  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };
  jar.set(cookieName(provider, 'state'), state, opts);
  jar.set(cookieName(provider, 'pkce'), verifier, opts);
  jar.set(cookieName(provider, 'redirect'), sanitizePostAuthRedirect(redirectAfter), opts);
}

export async function readOAuthCookies(provider: OAuthProviderId): Promise<{
  state: string | undefined;
  verifier: string | undefined;
  redirectTo: string;
}> {
  const jar = await cookies();
  const state = jar.get(cookieName(provider, 'state'))?.value;
  const verifier = jar.get(cookieName(provider, 'pkce'))?.value;
  const redirectTo = sanitizePostAuthRedirect(jar.get(cookieName(provider, 'redirect'))?.value);
  jar.delete(cookieName(provider, 'state'));
  jar.delete(cookieName(provider, 'pkce'));
  jar.delete(cookieName(provider, 'redirect'));
  return { state, verifier, redirectTo };
}
