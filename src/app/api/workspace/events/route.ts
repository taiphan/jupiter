import { z } from 'zod';
import { json, error, requireDb } from '@/server/api-helpers';
import { getCurrentUser } from '@/server/auth/session';
import { recordWorkspaceEvent } from '@/server/persistence/workspace-events';

const bodySchema = z.object({
  projectId: z.string().optional(),
  kind: z.string().min(1),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const dbError = requireDb();
  if (dbError) return dbError;

  const user = await getCurrentUser();
  if (!user) return error('Not authenticated', 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error('Invalid event payload', 400);

  await recordWorkspaceEvent({
    projectId: parsed.data.projectId,
    actorId: user.id,
    kind: parsed.data.kind,
    message: parsed.data.message,
    metadata: parsed.data.metadata,
  });

  return json({ ok: true });
}
