import { z } from 'zod';
import { json, error, requireDb } from '@/server/api-helpers';
import { getCurrentUser } from '@/server/auth/session';
import { loadWorkspace, saveWorkspace, workspaceIsEmpty } from '@/server/workspace/repository';
import type { WorkspaceSnapshot } from '@/lib/workspace-types';

const snapshotSchema = z.object({
  projects: z.array(z.unknown()),
  members: z.array(z.unknown()),
  issues: z.array(z.unknown()),
  comments: z.array(z.unknown()),
  activity: z.array(z.unknown()),
  attachments: z.array(z.unknown()),
  sprints: z.array(z.unknown()),
  issueLinks: z.array(z.unknown()),
  customFields: z.array(z.unknown()),
  quickFilters: z.array(z.unknown()),
});

export async function GET() {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const empty = await workspaceIsEmpty();
  if (empty) return json({ empty: true });

  const snapshot = await loadWorkspace();
  return json(snapshot);
}

export async function PUT(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const body = await request.json().catch(() => null);
  const parsed = snapshotSchema.safeParse(body);
  if (!parsed.success) return error('Invalid workspace payload', 400);

  await saveWorkspace(parsed.data as WorkspaceSnapshot);
  return json({ ok: true });
}
