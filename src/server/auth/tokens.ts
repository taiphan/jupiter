import { createHash, randomBytes } from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';

export type AuthTokenPurpose = 'verify_email' | 'password_reset';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newRawToken(): string {
  return randomBytes(32).toString('hex');
}

export async function issueAuthToken(
  userId: string,
  purpose: AuthTokenPurpose,
): Promise<string> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const raw = newRawToken();
  const ttl = purpose === 'verify_email' ? VERIFY_TTL_MS : RESET_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);

  await db.delete(schema.authTokens).where(
    and(eq(schema.authTokens.userId, userId), eq(schema.authTokens.purpose, purpose)),
  );

  await db.insert(schema.authTokens).values({
    id: randomBytes(12).toString('hex'),
    userId,
    purpose,
    tokenHash: hashToken(raw),
    expiresAt,
  });

  return raw;
}

export async function consumeAuthToken(
  raw: string,
  purpose: AuthTokenPurpose,
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const tokenHash = hashToken(raw);
  const now = new Date();
  const rows = await db
    .select()
    .from(schema.authTokens)
    .where(
      and(
        eq(schema.authTokens.tokenHash, tokenHash),
        eq(schema.authTokens.purpose, purpose),
        gt(schema.authTokens.expiresAt, now),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db.delete(schema.authTokens).where(eq(schema.authTokens.id, row.id));
  return row.userId;
}
