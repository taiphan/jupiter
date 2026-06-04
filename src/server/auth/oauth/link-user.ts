import { randomBytes } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { schema, type getDb } from '@/server/db/client';
import { normalizeEmail, usernameFromEmail } from '../email-normalize';
import { markEmailVerified } from '../users';
import { planOAuthAccountLink } from './link-plan';
import type { OAuthProfile, OAuthProviderId } from './types';

export async function linkOrCreateOAuthUser(
  db: NonNullable<ReturnType<typeof getDb>>,
  provider: OAuthProviderId,
  profile: OAuthProfile,
): Promise<string> {
  const email = normalizeEmail(profile.email);

  const oauthRows = await db
    .select()
    .from(schema.oauthAccounts)
    .where(
      and(
        eq(schema.oauthAccounts.provider, provider),
        eq(schema.oauthAccounts.providerAccountId, profile.providerAccountId),
      ),
    )
    .limit(1);

  const emailRows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  const plan = planOAuthAccountLink(oauthRows[0]?.userId, emailRows[0]?.id);

  if (plan.action === 'sign_in') return plan.userId;

  if (plan.action === 'link') {
    const existing = emailRows[0]!;
    await db
      .insert(schema.oauthAccounts)
      .values({
        id: `oauth_${randomBytes(8).toString('hex')}`,
        userId: existing.id,
        provider,
        providerAccountId: profile.providerAccountId,
        emailAtLink: email,
      })
      .onConflictDoNothing();
    if (!existing.emailVerifiedAt && profile.emailVerified) {
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
    emailVerifiedAt: profile.emailVerified ? new Date() : null,
  });

  await db.insert(schema.oauthAccounts).values({
    id: `oauth_${randomBytes(8).toString('hex')}`,
    userId: id,
    provider,
    providerAccountId: profile.providerAccountId,
    emailAtLink: email,
  });

  return id;
}
