import { getCurrentUser } from '@/server/auth/session';
import { json, requireDb } from '@/server/api-helpers';

export async function GET() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return json({ user: null });

  const { passwordHash: _ph, ...safe } = user;
  void _ph;
  return json({ user: safe });
}
