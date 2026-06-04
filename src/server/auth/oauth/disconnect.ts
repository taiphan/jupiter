import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';
import type { OAuthProviderId } from './types';

export async function disconnectOAuth(
  userId: string,
  provider: OAuthProviderId,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: 'Database not configured' };

  const userRows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  const user = userRows[0];
  if (!user) return { ok: false, error: 'User not found' };

  const linkRows = await db
    .select()
    .from(schema.oauthAccounts)
    .where(
      and(eq(schema.oauthAccounts.userId, userId), eq(schema.oauthAccounts.provider, provider)),
    )
    .limit(1);
  if (!linkRows[0]) {
    return { ok: false, error: `${provider} is not connected` };
  }

  const otherOAuth = await db
    .select({ id: schema.oauthAccounts.id })
    .from(schema.oauthAccounts)
    .where(eq(schema.oauthAccounts.userId, userId));

  const hasPassword = Boolean(user.passwordHash);
  const otherProviders = otherOAuth.filter((o) => o.id !== linkRows[0]!.id).length;

  if (!hasPassword && otherProviders === 0) {
    return {
      ok: false,
      error: 'Set a password before disconnecting your only sign-in method.',
    };
  }

  await db
    .delete(schema.oauthAccounts)
    .where(eq(schema.oauthAccounts.id, linkRows[0]!.id));

  return { ok: true };
}

export async function listOAuthProvidersForUser(userId: string): Promise<OAuthProviderId[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select({ provider: schema.oauthAccounts.provider })
    .from(schema.oauthAccounts)
    .where(eq(schema.oauthAccounts.userId, userId));
  return rows.map((r) => r.provider);
}
