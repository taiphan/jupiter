import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';
import type { DbUser } from '@/server/db/schema';

const TOKEN_PREFIX = 'jpt_';

export function generateApiToken(): { raw: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString('base64url');
  const raw = `${TOKEN_PREFIX}${secret}`;
  const prefix = raw.slice(0, 12);
  const hash = hashToken(raw);
  return { raw, prefix, hash };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export async function authenticateBearerToken(
  authorization: string | null,
): Promise<DbUser | null> {
  if (!authorization?.startsWith('Bearer ')) return null;
  const raw = authorization.slice(7).trim();
  if (!raw.startsWith(TOKEN_PREFIX)) return null;

  const db = getDb();
  if (!db) return null;

  const tokenHash = hashToken(raw);
  const rows = await db
    .select()
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.tokenHash, tokenHash))
    .limit(1);
  const token = rows[0];
  if (!token) return null;

  if (token.expiresAt && new Date(token.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const userRows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, token.userId))
    .limit(1);
  const user = userRows[0];
  if (!user?.emailVerifiedAt) return null;

  await db
    .update(schema.apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiTokens.id, token.id));

  return user;
}

export type ApiTokenListItem = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

export async function listApiTokensForUser(userId: string): Promise<ApiTokenListItem[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.userId, userId));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    tokenPrefix: r.tokenPrefix,
    scopes: r.scopes as string[],
    expiresAt: r.expiresAt?.toISOString() ?? null,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createApiTokenForUser(
  userId: string,
  name: string,
  scopes: string[] = ['workspace:read'],
  expiresInDays?: number,
): Promise<{ token: ApiTokenListItem; raw: string } | { error: string }> {
  const db = getDb();
  if (!db) return { error: 'Database not configured' };

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) {
    return { error: 'Token name is required (max 100 characters)' };
  }

  const existing = await db
    .select({ id: schema.apiTokens.id })
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.userId, userId));
  if (existing.length >= 25) {
    return { error: 'Maximum 25 personal access tokens per user' };
  }

  const { raw, prefix, hash } = generateApiToken();
  const id = `pat_${randomBytes(8).toString('hex')}`;
  const expiresAt =
    expiresInDays && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  await db.insert(schema.apiTokens).values({
    id,
    userId,
    name: trimmed,
    tokenPrefix: prefix,
    tokenHash: hash,
    scopes,
    expiresAt,
  });

  return {
    raw,
    token: {
      id,
      name: trimmed,
      tokenPrefix: prefix,
      scopes,
      expiresAt: expiresAt?.toISOString() ?? null,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function revokeApiToken(
  userId: string,
  tokenId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: 'Database not configured' };

  const rows = await db
    .select()
    .from(schema.apiTokens)
    .where(and(eq(schema.apiTokens.id, tokenId), eq(schema.apiTokens.userId, userId)))
    .limit(1);
  if (!rows[0]) return { ok: false, error: 'Token not found' };

  await db.delete(schema.apiTokens).where(eq(schema.apiTokens.id, tokenId));
  return { ok: true };
}

/** Constant-time compare for tests / validation helpers. */
export function tokensMatch(storedHash: string, raw: string): boolean {
  const a = Buffer.from(storedHash, 'hex');
  const b = Buffer.from(hashToken(raw), 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
