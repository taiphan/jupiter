import { getCurrentUserAllowUnverified } from '@/server/auth/session';
import { listSessionsForUser } from '@/server/auth/sessions-mgmt';
import { json, error, requireDb } from '@/server/api-helpers';

export async function GET() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUserAllowUnverified();
  if (!user) return error('Not authenticated', 401);

  const sessions = await listSessionsForUser(user.id);
  return json({ sessions });
}
