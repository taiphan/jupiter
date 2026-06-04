import { z } from 'zod';
import { json, error, requireDb } from '@/server/api-helpers';
import { getCurrentUser } from '@/server/auth/session';
import { markNotificationsRead } from '@/server/persistence/notifications';

const bodySchema = z.object({
  activityIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('activityIds array is required', 400);

  await markNotificationsRead(user.id, parsed.data.activityIds);
  return json({ ok: true });
}
