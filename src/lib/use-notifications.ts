'use client';

import { useMemo } from 'react';
import { useIssuesStore } from './issues-store';
import { useNotificationsStore } from './notifications-store';
import { useAuthStore } from './auth-store';
import type { ActivityEntry, Issue } from './types';

export interface Notification {
  id: string;
  activity: ActivityEntry;
  issue: Issue;
  read: boolean;
}

/**
 * Build the current user's notification feed from the activity log:
 *  - Activity on issues they are assigned to or reported
 *  - Excludes actions the user performed themselves
 */
export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
} {
  const user = useAuthStore((s) => s.user);
  const issues = useIssuesStore((s) => s.issues);
  const activity = useIssuesStore((s) => s.activity);
  const readByUser = useNotificationsStore((s) => s.readByUser);

  return useMemo(() => {
    if (!user) return { notifications: [], unreadCount: 0 };

    const issueById = new Map(issues.map((i) => [i.id, i]));
    const readSet = new Set(readByUser[user.id] ?? []);

    const relevant = activity
      .filter((a) => {
        if (a.actorId === user.id) return false; // not your own actions
        const issue = issueById.get(a.issueId);
        if (!issue) return false;
        return issue.assigneeId === user.id || issue.reporterId === user.id;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30);

    const notifications: Notification[] = relevant.map((a) => ({
      id: a.id,
      activity: a,
      issue: issueById.get(a.issueId)!,
      read: readSet.has(a.id),
    }));

    return {
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    };
  }, [user, issues, activity, readByUser]);
}
