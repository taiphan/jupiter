import { and, desc, eq, ilike, lt, or, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import { mapActivityRow } from '@/server/db/mappers';
import type { AuditEntry, AuditPage } from '@/lib/audit-types';
import type { ActivityKind } from '@/lib/types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export type AuditQuery = {
  limit?: number;
  cursor?: string | null;
  projectId?: string | null;
  actorId?: string | null;
  kind?: string | null;
  search?: string | null;
};

export function encodeAuditCursor(
  createdAt: string,
  id: string,
  source: 'issue' | 'workspace',
): string {
  return Buffer.from(`${createdAt}|${id}|${source}`, 'utf8').toString('base64url');
}

export function decodeAuditCursor(
  cursor: string,
): { createdAt: Date; id: string; source: 'issue' | 'workspace' } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const [createdAt, id, source] = raw.split('|');
    if (!createdAt || !id || (source !== 'issue' && source !== 'workspace')) return null;
    return { createdAt: new Date(createdAt), id, source };
  } catch {
    return null;
  }
}

export async function queryAudit(userId: string, query: AuditQuery): Promise<AuditPage> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  void userId;

  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const decoded = query.cursor ? decodeAuditCursor(query.cursor) : null;
  const fetchLimit = limit + 1;

  const activityConditions = [];
  if (query.projectId && query.projectId !== 'all') {
    activityConditions.push(eq(schema.issues.projectId, query.projectId));
  }
  if (query.actorId && query.actorId !== 'all') {
    activityConditions.push(eq(schema.activity.actorId, query.actorId));
  }
  if (query.kind && query.kind !== 'all') {
    if (query.kind.startsWith('ws.')) {
      activityConditions.push(sql`false`);
    } else {
      activityConditions.push(eq(schema.activity.kind, query.kind));
    }
  }
  if (decoded) {
    activityConditions.push(
      or(
        lt(schema.activity.createdAt, decoded.createdAt),
        and(eq(schema.activity.createdAt, decoded.createdAt), lt(schema.activity.id, decoded.id)),
      )!,
    );
  }
  if (query.search?.trim()) {
    const q = `%${query.search.trim()}%`;
    activityConditions.push(
      or(
        ilike(schema.activity.message, q),
        ilike(schema.issues.key, q),
        ilike(schema.issues.summary, q),
      )!,
    );
  }

  const activityWhere =
    activityConditions.length > 0 ? and(...activityConditions) : undefined;

  const activityRows = await db
    .select({
      activity: schema.activity,
      issue: schema.issues,
    })
    .from(schema.activity)
    .innerJoin(schema.issues, eq(schema.activity.issueId, schema.issues.id))
    .where(activityWhere)
    .orderBy(desc(schema.activity.createdAt), desc(schema.activity.id))
    .limit(fetchLimit);

  const wsConditions = [];
  if (query.projectId && query.projectId !== 'all') {
    wsConditions.push(eq(schema.workspaceEvents.projectId, query.projectId));
  }
  if (query.actorId && query.actorId !== 'all') {
    wsConditions.push(eq(schema.workspaceEvents.actorId, query.actorId));
  }
  if (query.kind && query.kind !== 'all') {
    if (query.kind.startsWith('ws.')) {
      wsConditions.push(eq(schema.workspaceEvents.kind, query.kind.slice(3)));
    } else {
      wsConditions.push(sql`false`);
    }
  }
  if (decoded) {
    wsConditions.push(
      or(
        lt(schema.workspaceEvents.createdAt, decoded.createdAt),
        and(
          eq(schema.workspaceEvents.createdAt, decoded.createdAt),
          lt(schema.workspaceEvents.id, decoded.id),
        ),
      )!,
    );
  }
  if (query.search?.trim()) {
    wsConditions.push(ilike(schema.workspaceEvents.message, `%${query.search.trim()}%`));
  }

  const wsWhere = wsConditions.length > 0 ? and(...wsConditions) : undefined;

  const wsRows = await db
    .select()
    .from(schema.workspaceEvents)
    .where(wsWhere)
    .orderBy(desc(schema.workspaceEvents.createdAt), desc(schema.workspaceEvents.id))
    .limit(fetchLimit);

  const issueEntries: AuditEntry[] = activityRows.map((row) => ({
    source: 'issue' as const,
    id: row.activity.id,
    issueId: row.activity.issueId,
    actorId: row.activity.actorId,
    kind: mapActivityRow(row.activity).kind as ActivityKind,
    message: row.activity.message,
    createdAt: row.activity.createdAt.toISOString(),
    issueKey: row.issue.key,
    issueSummary: row.issue.summary,
    projectId: row.issue.projectId,
  }));

  const workspaceEntries: AuditEntry[] = wsRows.map((row) => ({
    source: 'workspace' as const,
    id: row.id,
    projectId: row.projectId,
    actorId: row.actorId,
    kind: row.kind,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata ?? undefined,
  }));

  const merged = [...issueEntries, ...workspaceEntries].sort((a, b) => {
    const cmp = b.createdAt.localeCompare(a.createdAt);
    if (cmp !== 0) return cmp;
    return b.id.localeCompare(a.id);
  });

  const page = merged.slice(0, limit);
  const hasMore = merged.length > limit;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeAuditCursor(last.createdAt, last.id, last.source)
      : null;

  return { entries: page, nextCursor };
}
