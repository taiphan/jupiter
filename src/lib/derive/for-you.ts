import type { ActivityEntry, Issue } from '@/lib/types';
import { isOverdue } from './due-date';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Open issues assigned to the user with due date within N days (or overdue). */
export function issuesDueSoon(
  issues: Issue[],
  userId: string,
  withinDays = 7,
): Issue[] {
  const today = startOfToday();
  const horizon = new Date(today.getTime() + withinDays * MS_PER_DAY);

  return issues
    .filter((i) => {
      if (i.assigneeId !== userId || i.status === 'done' || !i.dueDate) return false;
      const due = new Date(`${i.dueDate}T00:00:00`);
      if (Number.isNaN(due.getTime())) return false;
      return due <= horizon || isOverdue(i);
    })
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
}

/** Recent activity on issues the user cares about (assignee, reporter, or watcher). */
export function recentChangesForUser(
  activity: ActivityEntry[],
  issues: Issue[],
  userId: string,
  limit = 8,
): Array<{ activity: ActivityEntry; issue: Issue }> {
  const issueById = new Map(issues.map((i) => [i.id, i]));
  const relevantIssueIds = new Set(
    issues
      .filter(
        (i) =>
          i.assigneeId === userId ||
          i.reporterId === userId ||
          i.watcherIds.includes(userId),
      )
      .map((i) => i.id),
  );

  return activity
    .filter((a) => a.actorId !== userId && relevantIssueIds.has(a.issueId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((a) => ({ activity: a, issue: issueById.get(a.issueId)! }))
    .filter((row) => row.issue);
}
