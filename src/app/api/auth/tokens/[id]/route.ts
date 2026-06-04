import { getCurrentUser } from '@/server/auth/session';
import { revokeApiToken } from '@/server/auth/api-tokens';
import { json, error, requireDb } from '@/server/api-helpers';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const { id } = await context.params;
  const result = await revokeApiToken(user.id, id);
  if (!result.ok) return error(result.error, 400);

  return json({ ok: true });
}
