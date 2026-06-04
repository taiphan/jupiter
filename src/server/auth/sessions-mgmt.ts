import { eq, and, ne, desc } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';
import { getCurrentSessionId } from './session';

export type SessionListItem = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export async function listSessionsForUser(userId: string): Promise<SessionListItem[]> {
  const db = getDb();
  if (!db) return [];

  const currentId = await getCurrentSessionId();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, userId))
    .orderBy(desc(schema.sessions.createdAt));

  const now = Date.now();
  return rows
    .filter((s) => new Date(s.expiresAt).getTime() > now)
    .map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      current: s.id === currentId,
    }));
}

export async function revokeSession(
  userId: string,
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: 'Database not configured' };

  const rows = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, sessionId), eq(schema.sessions.userId, userId)))
    .limit(1);
  if (!rows[0]) return { ok: false, error: 'Session not found' };

  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
  return { ok: true };
}

export async function revokeAllOtherSessions(
  userId: string,
  keepSessionId: string | null,
): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const before = await listSessionsForUser(userId);

  if (!keepSessionId) {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  } else {
    await db
      .delete(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), ne(schema.sessions.id, keepSessionId)));
  }

  const after = await listSessionsForUser(userId);
  return Math.max(0, before.length - after.length);
}
