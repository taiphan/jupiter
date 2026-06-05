/** Fire-and-forget issue event email to watchers/assignee/reporter. */
export async function notifyIssueEventEmail(input: {
  issueKey: string;
  summary: string;
  message: string;
  recipientUserIds: string[];
}): Promise<void> {
  if (typeof window === 'undefined' || input.recipientUserIds.length === 0) return;
  try {
    await fetch('/api/notify/issue-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
  } catch {
    /* best effort */
  }
}
