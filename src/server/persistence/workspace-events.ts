import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import { uid } from '@/lib/utils';

export async function recordWorkspaceEvent(input: {
  projectId?: string | null;
  actorId: string;
  kind: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.insert(schema.workspaceEvents).values({
    id: uid('wse'),
    projectId: input.projectId ?? null,
    actorId: input.actorId,
    kind: input.kind,
    message: input.message,
    metadata: input.metadata ?? null,
    createdAt: new Date(),
  });
}
