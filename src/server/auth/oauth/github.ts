import { getAuthSettings } from '../auth-settings';
import { clientIp, checkRateLimit } from '../rate-limit';
import { createSession } from '../session';
import { getDb } from '@/server/db/client';
import { assertProviderEnabled } from './provider-config';
import { base64Url, setOAuthCookies, readOAuthCookies } from './pkce';
import { randomBytes } from 'node:crypto';
import { linkOrCreateOAuthUser } from './link-user';
import type { OAuthProfile } from './types';

export async function startGitHubSignIn(
  request: Request,
  redirectAfter?: string | null,
): Promise<string> {
  const cfg = await assertProviderEnabled('github');
  const settings = await getAuthSettings();

  const ip = clientIp(request);
  const limit = checkRateLimit(`oauth:github:start:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) throw new Error('rate_limited');

  const state = base64Url(randomBytes(24));
  const verifier = base64Url(randomBytes(32));
  await setOAuthCookies('github', state, verifier, redirectAfter);

  const redirectUri = `${settings.appUrl}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
  });

  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function completeGitHubCallback(
  request: Request,
  code: string,
  state: string,
): Promise<
  | { ok: true; userId: string; redirectTo: string }
  | { ok: false; reason: string }
> {
  const cfg = await assertProviderEnabled('github');
  const settings = await getAuthSettings();

  const ip = clientIp(request);
  const limit = checkRateLimit(`oauth:github:callback:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return { ok: false, reason: 'rate_limited' };

  const { state: expected, redirectTo } = await readOAuthCookies('github');
  if (!expected || expected !== state) {
    return { ok: false, reason: 'invalid_state' };
  }

  const redirectUri = `${settings.appUrl}/api/auth/github/callback`;

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret!,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) return { ok: false, reason: 'token_exchange_failed' };

  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenJson.access_token) return { ok: false, reason: 'no_access_token' };

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Jupiter',
    },
  });
  if (!userRes.ok) return { ok: false, reason: 'userinfo_failed' };

  const ghUser = (await userRes.json()) as { id?: number; login?: string; name?: string; email?: string };

  let email = ghUser.email ?? '';
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Jupiter',
      },
    });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as { email: string; primary: boolean; verified: boolean }[];
      const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
      email = primary?.email ?? '';
    }
  }

  if (!ghUser.id || !email) return { ok: false, reason: 'email_not_verified' };

  const profile: OAuthProfile = {
    providerAccountId: String(ghUser.id),
    email,
    emailVerified: true,
    name: ghUser.name ?? ghUser.login,
  };

  const db = getDb();
  if (!db) return { ok: false, reason: 'no_db' };

  const userId = await linkOrCreateOAuthUser(db, 'github', profile);
  await createSession(userId, request);
  return { ok: true, userId, redirectTo };
}
