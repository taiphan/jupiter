import { json, error, requireDb } from '@/server/api-helpers';
import { getCurrentUser } from '@/server/auth/session';
import { getNotificationFeed } from '@/server/persistence/notifications';

export async function GET() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const feed = await getNotificationFeed(user.id);
  return json(feed);
}
