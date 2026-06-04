import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import { uid } from '@/lib/utils';

export type BurndownSnapshotPoint = {
  date: string;
  remaining: number;
  scopePoints?: number;
};

export async function getBurndownSnapshots(sprintId: string): Promise<BurndownSnapshotPoint[]> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const rows = await db
    .select()
    .from(schema.burndownSnapshots)
    .where(eq(schema.burndownSnapshots.sprintId, sprintId))
    .orderBy(asc(schema.burndownSnapshots.recordedAt));

  return rows.map((r) => ({
    date: r.recordedAt.toISOString(),
    remaining: r.remainingPoints,
    scopePoints: r.scopePoints ?? undefined,
  }));
}

export async function appendBurndownSnapshot(input: {
  sprintId: string;
  remainingPoints: number;
  scopePoints?: number;
  recordedAt?: Date;
}): Promise<BurndownSnapshotPoint> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const recordedAt = input.recordedAt ?? new Date();
  await db.insert(schema.burndownSnapshots).values({
    id: uid('bds'),
    sprintId: input.sprintId,
    recordedAt,
    remainingPoints: input.remainingPoints,
    scopePoints: input.scopePoints ?? null,
  });

  return {
    date: recordedAt.toISOString(),
    remaining: input.remainingPoints,
    scopePoints: input.scopePoints,
  };
}

export async function getBurndownSnapshotsForProject(
  projectId: string,
): Promise<Record<string, BurndownSnapshotPoint[]>> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const sprintRows = await db
    .select({ id: schema.sprints.id })
    .from(schema.sprints)
    .where(eq(schema.sprints.projectId, projectId));

  const out: Record<string, BurndownSnapshotPoint[]> = {};
  for (const { id } of sprintRows) {
    out[id] = await getBurndownSnapshots(id);
  }
  return out;
}
