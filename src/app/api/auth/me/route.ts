import { getCurrentUserAllowUnverified } from '@/server/auth/session';
import { json, requireDb } from '@/server/api-helpers';
import { toPublicUser } from '@/server/auth/user-mapper';
import { getGoogleLinkForUser } from '@/server/auth/google';
import { isGoogleAuthEnabled } from '@/server/auth/config';

export async function GET() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUserAllowUnverified();
  if (!user) return json({ user: null, googleConnected: false, googleAuthAvailable: false });

  const googleLink = await getGoogleLinkForUser(user.id);

  return json({
    user: toPublicUser(user),
    googleConnected: Boolean(googleLink),
    googleAuthAvailable: isGoogleAuthEnabled(),
  });
}
