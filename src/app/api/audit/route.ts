import { json, error, requireDb } from '@/server/api-helpers';
import { getCurrentUser } from '@/server/auth/session';
import { hasPermission } from '@/lib/permissions';
import { queryAudit } from '@/server/persistence/audit';

export async function GET(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);
  if (!hasPermission(user.role, 'audit.view')) return error('Forbidden', 403);

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const page = await queryAudit(user.id, {
    limit: limit ? Number(limit) : undefined,
    cursor: searchParams.get('cursor'),
    projectId: searchParams.get('projectId'),
    actorId: searchParams.get('actorId'),
    kind: searchParams.get('kind'),
    search: searchParams.get('search'),
  });

  return json(page);
}
