import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';
import type { DbUser } from '@/server/db/schema';
import { hashPassword } from './password';
import { normalizeEmail, usernameFromEmail } from './email-normalize';

export async function findUserByEmail(email: string): Promise<DbUser | undefined> {
  const db = getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizeEmail(email)))
    .limit(1);
  return rows[0];
}

export async function createPasswordUser(input: {
  email: string;
  password: string;
  name: string;
  role?: DbUser['role'];
}): Promise<DbUser> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const email = normalizeEmail(input.email);
  let username = usernameFromEmail(email);
  const existingUsername = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);
  if (existingUsername[0]) {
    username = `${username}_${randomBytes(3).toString('hex')}`;
  }

  const passwordHash = await hashPassword(input.password);
  const id = `usr_${randomBytes(8).toString('hex')}`;

  const rows = await db
    .insert(schema.users)
    .values({
      id,
      username,
      name: input.name,
      email,
      passwordHash,
      role: input.role ?? 'member',
      avatarColor: '#0C66E4',
      title: '',
      emailVerifiedAt: null,
    })
    .returning();

  return rows[0]!;
}

export async function markEmailVerified(userId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(schema.users.id, userId));
}

export async function updatePassword(userId: string, password: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const passwordHash = await hashPassword(password);
  await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId));
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
