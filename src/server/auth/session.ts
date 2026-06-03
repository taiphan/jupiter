import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';
import type { DbUser } from '@/server/db/schema';

export const SESSION_COOKIE = 'jupiter_session';
const SESSION_TTL_DAYS = 30;

export function newSessionId(): string {
  return randomBytes(24).toString('hex');
}

/** Create a session row and set the cookie. */
export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const id = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(schema.sessions).values({ id, userId, expiresAt });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
  return id;
}

/** Resolve the current user from the session cookie, or null. */
export async function getCurrentUser(): Promise<DbUser | null> {
  const db = getDb();
  if (!db) return null;

  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const rows = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);
  const session = rows[0];
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    return null;
  }

  const userRows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  return userRows[0] ?? null;
}

/** Destroy the current session. */
export async function destroySession(): Promise<void> {
  const db = getDb();
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (sessionId && db) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
  }
  jar.delete(SESSION_COOKIE);
}
