import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/server/db/client';
import { verifyPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';
import { json, error, requireDb } from '@/server/api-helpers';
import { loginBodySchema } from '@/server/auth/schemas';
import { normalizeEmail } from '@/server/auth/email-normalize';
import { checkRateLimit, clientIp } from '@/server/auth/rate-limit';
import { toPublicUser } from '@/server/auth/user-mapper';
import { userHas2faEnabled } from '@/server/auth/totp';
import { setTotpChallenge } from '@/server/auth/totp-challenge';
import { isTwoFactorEnabled } from '@/server/auth/config';

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const ip = clientIp(request);
  const limit = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return error('Too many attempts. Try again later.', 429);
  }

  const parsed = loginBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Email and password are required');

  const db = getDb()!;
  const email = normalizeEmail(parsed.data.email);
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  const user = rows[0];

  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    return error('Invalid email or password', 401);
  }

  if (!user.emailVerifiedAt) {
    return error('Please verify your email before signing in.', 403);
  }

  if ((await isTwoFactorEnabled()) && userHas2faEnabled(user)) {
    await setTotpChallenge(user.id);
    return json({ requires2fa: true });
  }

  await createSession(user.id, request);
  return json({ user: toPublicUser(user) });
}
