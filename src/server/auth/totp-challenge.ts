import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getAuthSecret } from './config';

export const TOTP_CHALLENGE_COOKIE = 'jupiter_2fa_challenge';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function signPayload(payload: string): string {
  return createHmac('sha256', getAuthSecret()).update(payload).digest('hex');
}

function buildToken(userId: string): string {
  const exp = Date.now() + CHALLENGE_TTL_MS;
  const nonce = randomBytes(8).toString('hex');
  const payload = `${userId}.${exp}.${nonce}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

function parseToken(token: string): { userId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [userId, expStr, nonce, sig] = parts;
  if (!userId || !expStr || !nonce || !sig) return null;
  const payload = `${userId}.${expStr}.${nonce}`;
  const expected = signPayload(payload);
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  return { userId };
}

export async function setTotpChallenge(userId: string): Promise<void> {
  const token = buildToken(userId);
  const jar = await cookies();
  jar.set(TOTP_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CHALLENGE_TTL_MS / 1000,
  });
}

export async function readTotpChallengeUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(TOTP_CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  return parseToken(token)?.userId ?? null;
}

export async function clearTotpChallenge(): Promise<void> {
  const jar = await cookies();
  jar.delete(TOTP_CHALLENGE_COOKIE);
}
