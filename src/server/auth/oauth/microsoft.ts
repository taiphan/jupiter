import { getAuthSettings } from '../auth-settings';
import { clientIp, checkRateLimit } from '../rate-limit';
import { createSession } from '../session';
import { getDb } from '@/server/db/client';
import { assertProviderEnabled } from './provider-config';
import { randomBytes } from 'node:crypto';
import { base64Url, pkceChallenge, setOAuthCookies, readOAuthCookies } from './pkce';
import { linkOrCreateOAuthUser } from './link-user';
import type { OAuthProfile } from './types';

export async function startMicrosoftSignIn(
  request: Request,
  redirectAfter?: string | null,
): Promise<string> {
  const cfg = await assertProviderEnabled('microsoft');
  const settings = await getAuthSettings();

  const ip = clientIp(request);
  const limit = checkRateLimit(`oauth:microsoft:start:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) throw new Error('rate_limited');

  const tenant = cfg.microsoftTenantId ?? 'common';
  const state = base64Url(randomBytes(24));
  const verifier = base64Url(randomBytes(32));
  await setOAuthCookies('microsoft', state, verifier, redirectAfter);

  const redirectUri = `${settings.appUrl}/api/auth/microsoft/callback`;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: 'S256',
    response_mode: 'query',
  });

  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
}

export async function completeMicrosoftCallback(
  request: Request,
  code: string,
  state: string,
): Promise<
  | { ok: true; userId: string; redirectTo: string }
  | { ok: false; reason: string }
> {
  const cfg = await assertProviderEnabled('microsoft');
  const settings = await getAuthSettings();

  const ip = clientIp(request);
  const limit = checkRateLimit(`oauth:microsoft:callback:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return { ok: false, reason: 'rate_limited' };

  const { state: expected, verifier, redirectTo } = await readOAuthCookies('microsoft');
  if (!expected || expected !== state || !verifier) {
    return { ok: false, reason: 'invalid_state' };
  }

  const tenant = cfg.microsoftTenantId ?? 'common';
  const redirectUri = `${settings.appUrl}/api/auth/microsoft/callback`;

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    },
  );

  if (!tokenRes.ok) return { ok: false, reason: 'token_exchange_failed' };

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) return { ok: false, reason: 'no_access_token' };

  const profileRes = await fetch('https://graph.microsoft.com/oidc/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileRes.ok) return { ok: false, reason: 'userinfo_failed' };

  const raw = (await profileRes.json()) as {
    sub?: string;
    email?: string;
    preferred_username?: string;
    name?: string;
  };

  const email = raw.email ?? raw.preferred_username;
  if (!raw.sub || !email) return { ok: false, reason: 'userinfo_failed' };

  const profile: OAuthProfile = {
    providerAccountId: raw.sub,
    email,
    emailVerified: true,
    name: raw.name,
  };

  const db = getDb();
  if (!db) return { ok: false, reason: 'no_db' };

  const userId = await linkOrCreateOAuthUser(db, 'microsoft', profile);
  await createSession(userId, request);
  return { ok: true, userId, redirectTo };
}
