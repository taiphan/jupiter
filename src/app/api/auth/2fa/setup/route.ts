import { getCurrentUser } from '@/server/auth/session';
import { json, error, requireDb } from '@/server/api-helpers';
import { isEmailVerified } from '@/server/auth/user-mapper';
import { assertTwoFactorFeature } from '@/server/auth/totp-guard';
import { startTotpSetup, userHas2faEnabled } from '@/server/auth/totp';
import { isTwoFactorEnabled } from '@/server/auth/config';

export async function POST() {
  if (!(await isTwoFactorEnabled())) return error('Not found', 404);

  const dbError = requireDb();
  if (dbError) return dbError;

  try {
    await assertTwoFactorFeature();
  } catch {
    return error('Not found', 404);
  }

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);
  if (!isEmailVerified(user)) {
    return error('Verify your email before enabling 2FA', 403);
  }
  if (userHas2faEnabled(user)) {
    return error('2FA is already enabled', 400);
  }

  const setup = await startTotpSetup(user);
  return json(setup);
}
