/** Users who should receive in-app notifications for issue activity. */
export function shouldReceiveIssueNotification(
  issue: {
    watcherIds: string[];
    assigneeId?: string;
    reporterId: string;
  },
  userId: string,
): boolean {
  return (
    issue.reporterId === userId ||
    issue.assigneeId === userId ||
    issue.watcherIds.includes(userId)
  );
}

/** Default watchers when an issue is created (reporter + assignee). */
export function defaultWatchersForIssue(reporterId: string, assigneeId?: string): string[] {
  const ids = new Set<string>([reporterId]);
  if (assigneeId) ids.add(assigneeId);
  return [...ids];
}

export function addWatcherIds(current: string[], ...userIds: string[]): string[] {
  const set = new Set(current);
  for (const id of userIds) {
    if (id) set.add(id);
  }
  return [...set];
}

export function removeWatcherId(current: string[], userId: string): string[] {
  return current.filter((id) => id !== userId);
}

export function isWatching(issue: { watcherIds: string[] }, userId: string): boolean {
  return issue.watcherIds.includes(userId);
}
