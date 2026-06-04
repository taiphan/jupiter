import { and, desc, eq, ne, or } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import { mapActivityRow } from '@/server/db/mappers';
import { mapIssueRow } from '@/server/db/mappers';
import type { ActivityEntry, Issue } from '@/lib/types';

export type NotificationPayload = {
  id: string;
  read: boolean;
  activity: ActivityEntry;
  issue: Issue;
};

const FEED_LIMIT = 30;

export async function getNotificationFeed(userId: string): Promise<{
  notifications: NotificationPayload[];
  unreadCount: number;
}> {
  const db = getDb();
  if (!db) throw new Error('Database not configured');

  const rows = await db
    .select({
      activity: schema.activity,
      issue: schema.issues,
    })
    .from(schema.activity)
    .innerJoin(schema.issues, eq(schema.activity.issueId, schema.issues.id))
    .where(
      and(
        ne(schema.activity.actorId, userId),
        or(eq(schema.issues.assigneeId, userId), eq(schema.issues.reporterId, userId)),
      ),
    )
    .orderBy(desc(schema.activity.createdAt))
    .limit(FEED_LIMIT);

  const readRows = await db
    .select({ activityId: schema.notificationReads.activityId })
    .from(schema.notificationReads)
    .where(eq(schema.notificationReads.userId, userId));

  const readSet = new Set(readRows.map((r) => r.activityId));

  const notifications: NotificationPayload[] = rows.map((row) => ({
    id: row.activity.id,
    read: readSet.has(row.activity.id),
    activity: mapActivityRow(row.activity),
    issue: mapIssueRow(row.issue),
  }));

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}

export async function markNotificationsRead(
  userId: string,
  activityIds: string[],
): Promise<void> {
  const db = getDb();
  if (!db || activityIds.length === 0) return;

  const now = new Date();
  for (const activityId of activityIds) {
    await db
      .insert(schema.notificationReads)
      .values({ userId, activityId, readAt: now })
      .onConflictDoNothing();
  }
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { notifications } = await getNotificationFeed(userId);
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
  await markNotificationsRead(userId, unreadIds);
  return unreadIds.length;
}

export async function getReadActivityIds(userId: string): Promise<string[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select({ activityId: schema.notificationReads.activityId })
    .from(schema.notificationReads)
    .where(eq(schema.notificationReads.userId, userId));
  return rows.map((r) => r.activityId);
}
