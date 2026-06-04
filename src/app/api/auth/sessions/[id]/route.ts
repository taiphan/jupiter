import { cookies } from 'next/headers';
import { getCurrentUserAllowUnverified, SESSION_COOKIE } from '@/server/auth/session';
import { revokeSession } from '@/server/auth/sessions-mgmt';
import { json, error, requireDb } from '@/server/api-helpers';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUserAllowUnverified();
  if (!user) return error('Not authenticated', 401);

  const { id } = await context.params;
  const result = await revokeSession(user.id, id);
  if (!result.ok) return error(result.error, 400);

  const jar = await cookies();
  if (jar.get(SESSION_COOKIE)?.value === id) {
    jar.delete(SESSION_COOKIE);
  }

  return json({ ok: true });
}
