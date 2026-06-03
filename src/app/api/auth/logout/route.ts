import { destroySession } from '@/server/auth/session';
import { json, requireDb } from '@/server/api-helpers';

export async function POST() {
  const dbError = requireDb();
  if (dbError) return dbError;
  await destroySession();
  return json({ ok: true });
}
