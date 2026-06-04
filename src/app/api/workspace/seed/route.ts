import { json, error, requireDb } from '@/server/api-helpers';
import { getCurrentUser } from '@/server/auth/session';
import { saveWorkspace, workspaceIsEmpty } from '@/server/workspace/repository';
import { buildSeedWorkspaceSnapshot } from '@/server/workspace/seed-data';

export async function POST() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const empty = await workspaceIsEmpty();
  if (!empty && user.role !== 'admin') return error('Forbidden', 403);

  await saveWorkspace(buildSeedWorkspaceSnapshot());
  return json({ ok: true });
}
