import { z } from 'zod';
import { json, error, requireDb } from '@/server/api-helpers';
import { getCurrentUser } from '@/server/auth/session';
import {
  appendBurndownSnapshot,
  getBurndownSnapshots,
} from '@/server/persistence/burndown';

const putSchema = z.object({
  remainingPoints: z.number().int().nonnegative(),
  scopePoints: z.number().int().nonnegative().optional(),
  recordedAt: z.string().datetime().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ sprintId: string }> },
) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const { sprintId } = await context.params;
  const snapshots = await getBurndownSnapshots(sprintId);
  return json({ sprintId, snapshots });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ sprintId: string }> },
) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const { sprintId } = await context.params;
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('remainingPoints is required', 400);

  const point = await appendBurndownSnapshot({
    sprintId,
    remainingPoints: parsed.data.remainingPoints,
    scopePoints: parsed.data.scopePoints,
    recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : undefined,
  });

  return json({ sprintId, point });
}
