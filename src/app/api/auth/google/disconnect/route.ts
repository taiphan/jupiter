import { getCurrentUserAllowUnverified } from '@/server/auth/session';
import { disconnectGoogle } from '@/server/auth/google';
import { json, error, requireDb } from '@/server/api-helpers';

export async function POST() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUserAllowUnverified();
  if (!user) return error('Not authenticated', 401);

  const result = await disconnectGoogle(user.id);
  if (!result.ok) return error(result.error, 400);

  return json({ ok: true });
}
