import { getCurrentUserAllowUnverified, getCurrentSessionId } from '@/server/auth/session';
import { revokeAllOtherSessions } from '@/server/auth/sessions-mgmt';
import { json, error, requireDb } from '@/server/api-helpers';

export async function POST() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUserAllowUnverified();
  if (!user) return error('Not authenticated', 401);

  const currentId = await getCurrentSessionId();
  const revoked = await revokeAllOtherSessions(user.id, currentId);
  return json({ ok: true, revoked });
}
