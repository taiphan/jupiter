import { json, error, requireDb } from '@/server/api-helpers';
import { getCurrentUser } from '@/server/auth/session';
import { markAllNotificationsRead } from '@/server/persistence/notifications';

export async function POST() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const marked = await markAllNotificationsRead(user.id);
  return json({ ok: true, marked });
}
