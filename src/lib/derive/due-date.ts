import type { Issue, IssueStatus } from '@/lib/types';

/** True when due date is before today and the issue is not done. */
export function isOverdue(issue: { dueDate?: string; status: IssueStatus }): boolean {
  if (!issue.dueDate || issue.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${issue.dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  return due < today;
}

export function formatDueDate(dueDate: string | undefined): string {
  if (!dueDate) return '—';
  const d = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function compareDueDates(a: Issue, b: Issue): number {
  const av = a.dueDate ?? '';
  const bv = b.dueDate ?? '';
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av.localeCompare(bv);
}
