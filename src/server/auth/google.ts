import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';
import { getAuthSettings } from './auth-settings';
import { normalizeEmail, usernameFromEmail } from './email-normalize';
import { createSession } from './session';
import { markEmailVerified } from './users';
import { sanitizePostAuthRedirect } from './redirect';
import { planGoogleAccountLink } from './google-link';
import { checkRateLimit, clientIp } from './rate-limit';

const STATE_COOKIE = 'jupiter_oauth_state';
const PKCE_COOKIE = 'jupiter_pkce_verifier';
const REDIRECT_COOKIE = 'jupiter_oauth_redirect';
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

function base64Url(buf: Buffer): string {
  return buf.toString('base64url');
}

function pkceChallenge(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest());
}

export async function assertGoogleEnabled(): Promise<void> {
  const s = await getAuthSettings();
  if (!s.googleAuthEnabled || !s.googleClientId || !s.googleClientSecret) {
    throw new Error('Google auth is not enabled');
  }
}

function isAllowedWorkspaceDomain(hd: string | undefined, allowedHd: string | null): boolean {
  if (!allowedHd) return true;
  return hd?.toLowerCase() === allowedHd.toLowerCase();
}

export async function startGoogleSignIn(
  request: Request,
  redirectAfter?: string | null,
): Promise<string> {
  await assertGoogleEnabled();
  const settings = await getAuthSettings();

  const ip = clientIp(request);
  const limit = checkRateLimit(`google:start:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    throw new Error('rate_limited');
  }

  const clientId = settings.googleClientId;
  const state = base64Url(randomBytes(24));
  const verifier = base64Url(randomBytes(32));
  const challenge = pkceChallenge(verifier);
  const redirectUri = `${settings.appUrl}/api/auth/google/callback`;
  const safeRedirect = sanitizePostAuthRedirect(redirectAfter);

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };
  jar.set(STATE_COOKIE, state, opts);
  jar.set(PKCE_COOKIE, verifier, opts);
  jar.set(REDIRECT_COOKIE, safeRedirect, opts);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  });

  if (settings.googleAllowedHd) {
    params.set('hd', settings.googleAllowedHd);
  }

  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  hd?: string;
};

export async function completeGoogleCallback(
  request: Request,
  code: string,
  state: string,
): Promise<
  | { ok: true; userId: string; redirectTo: string }
  | { ok: false; reason: string }
> {
  await assertGoogleEnabled();
  const settings = await getAuthSettings();

  const ip = clientIp(request);
  const limit = checkRateLimit(`google:callback:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return { ok: false, reason: 'rate_limited' };
  }

  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(PKCE_COOKIE)?.value;
  const redirectTo = sanitizePostAuthRedirect(jar.get(REDIRECT_COOKIE)?.value);
  jar.delete(STATE_COOKIE);
  jar.delete(PKCE_COOKIE);
  jar.delete(REDIRECT_COOKIE);

  if (!expectedState || expectedState !== state || !verifier) {
    return { ok: false, reason: 'invalid_state' };
  }

  const redirectUri = `${settings.appUrl}/api/auth/google/callback`;
  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: settings.googleClientId,
      client_secret: settings.googleClientSecret!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    return { ok: false, reason: 'token_exchange_failed' };
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string; id_token?: string };
  if (!tokenJson.access_token) {
    return { ok: false, reason: 'no_access_token' };
  }

  const profileRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileRes.ok) {
    return { ok: false, reason: 'userinfo_failed' };
  }

  const profile = (await profileRes.json()) as GoogleUserInfo;
  if (!profile.email_verified) {
    return { ok: false, reason: 'email_not_verified' };
  }
  if (!isAllowedWorkspaceDomain(profile.hd, settings.googleAllowedHd)) {
    return { ok: false, reason: 'domain_not_allowed' };
  }

  const db = getDb();
  if (!db) return { ok: false, reason: 'no_db' };

  const email = normalizeEmail(profile.email);
  const userId = await linkOrCreateGoogleUser(db, profile, email);
  await createSession(userId, request);
  return { ok: true, userId, redirectTo };
}

export async function linkOrCreateGoogleUser(
  db: NonNullable<ReturnType<typeof getDb>>,
  profile: GoogleUserInfo,
  email: string,
): Promise<string> {
  const oauthRows = await db
    .select()
    .from(schema.oauthAccounts)
    .where(
      and(
        eq(schema.oauthAccounts.provider, 'google'),
        eq(schema.oauthAccounts.providerAccountId, profile.sub),
      ),
    )
    .limit(1);

  const emailRows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  const plan = planGoogleAccountLink(oauthRows[0]?.userId, emailRows[0]?.id);

  if (plan.action === 'sign_in') {
    return plan.userId;
  }

  if (plan.action === 'link') {
    const existing = emailRows[0]!;
    await db
      .insert(schema.oauthAccounts)
      .values({
        id: `oauth_${randomBytes(8).toString('hex')}`,
        userId: existing.id,
        provider: 'google',
        providerAccountId: profile.sub,
        emailAtLink: email,
      })
      .onConflictDoNothing();
    if (!existing.emailVerifiedAt) {
      await markEmailVerified(existing.id);
    }
    return existing.id;
  }

  const id = `usr_${randomBytes(8).toString('hex')}`;
  let username = usernameFromEmail(email);
  const clash = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);
  if (clash[0]) username = `${username}_${randomBytes(3).toString('hex')}`;

  await db.insert(schema.users).values({
    id,
    username,
    name: profile.name ?? username,
    email,
    passwordHash: null,
    role: 'member',
    avatarColor: '#0C66E4',
    title: '',
    emailVerifiedAt: new Date(),
  });

  await db.insert(schema.oauthAccounts).values({
    id: `oauth_${randomBytes(8).toString('hex')}`,
    userId: id,
    provider: 'google',
    providerAccountId: profile.sub,
    emailAtLink: email,
  });

  return id;
}

export async function getGoogleLinkForUser(userId: string) {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(schema.oauthAccounts)
    .where(
      and(eq(schema.oauthAccounts.userId, userId), eq(schema.oauthAccounts.provider, 'google')),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function disconnectGoogle(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { disconnectOAuth } = await import('./oauth/disconnect');
  return disconnectOAuth(userId, 'google');
}
