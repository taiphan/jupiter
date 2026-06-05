'use client';

import { useMemo } from 'react';
import { useIssuesStore } from './issues-store';
import { useNotificationsStore } from './notifications-store';
import { useAuthStore } from './auth-store';
import { isWorkspaceOnline } from './workspace-mode';
import type { ActivityEntry, Issue } from './types';
import { shouldReceiveIssueNotification } from './derive/watchers';

export interface Notification {
  id: string;
  activity: ActivityEntry;
  issue: Issue;
  read: boolean;
}

/**
 * Notification feed: from API when Postgres is online, else derived from activity.
 */
export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
} {
  const user = useAuthStore((s) => s.user);
  const issues = useIssuesStore((s) => s.issues);
  const activity = useIssuesStore((s) => s.activity);
  const apiFeed = useNotificationsStore((s) =>
    user ? s.apiFeedByUser[user.id] : undefined,
  );
  const apiUnread = useNotificationsStore((s) =>
    user ? s.apiUnreadByUser[user.id] : undefined,
  );
  const readByUser = useNotificationsStore((s) => s.readByUser);

  return useMemo(() => {
    if (!user) return { notifications: [], unreadCount: 0 };

    if (isWorkspaceOnline() && apiFeed) {
      return {
        notifications: apiFeed,
        unreadCount: apiUnread ?? apiFeed.filter((n) => !n.read).length,
      };
    }

    const issueById = new Map(issues.map((i) => [i.id, i]));
    const readSet = new Set(readByUser[user.id] ?? []);

    const relevant = activity
      .filter((a) => {
        if (a.actorId === user.id) return false;
        const issue = issueById.get(a.issueId);
        if (!issue) return false;
        return shouldReceiveIssueNotification(issue, user.id);
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
  }, [user, issues, activity, readByUser, apiFeed, apiUnread]);
}
