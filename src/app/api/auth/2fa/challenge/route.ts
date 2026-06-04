import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';
import { createSession } from '@/server/auth/session';
import { json, error, requireDb } from '@/server/api-helpers';
import { totpChallengeBodySchema } from '@/server/auth/schemas';
import { checkRateLimit, clientIp } from '@/server/auth/rate-limit';
import {
  clearTotpChallenge,
  readTotpChallengeUserId,
} from '@/server/auth/totp-challenge';
import { userHas2faEnabled, verifyUserTotpOrBackup } from '@/server/auth/totp';
import { toPublicUser } from '@/server/auth/user-mapper';
import { isTwoFactorEnabled } from '@/server/auth/config';

export async function POST(request: Request) {
  if (!(await isTwoFactorEnabled())) return error('Not found', 404);

  const dbError = requireDb();
  if (dbError) return dbError;

  const userId = await readTotpChallengeUserId();
  if (!userId) return error('Sign in again to continue', 401);

  const ip = clientIp(request);
  const limit = checkRateLimit(`2fa:challenge:${userId}:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    await clearTotpChallenge();
    return error('Too many attempts. Sign in again.', 429);
  }

  const parsed = totpChallengeBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Enter a valid code');

  const db = getDb()!;
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user || !userHas2faEnabled(user)) {
    await clearTotpChallenge();
    return error('Sign in again to continue', 401);
  }

  const valid = await verifyUserTotpOrBackup(user, parsed.data);
  if (!valid) return error('Invalid code', 401);

  await clearTotpChallenge();
  await createSession(user.id, request);
  return json({ user: toPublicUser(user) });
}
