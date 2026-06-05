import { describe, expect, it } from 'vitest';
import { issuesDueSoon, recentChangesForUser } from '../for-you';
import type { ActivityEntry, Issue } from '@/lib/types';

function issue(partial: Partial<Issue> & Pick<Issue, 'id'>): Issue {
  return {
    id: partial.id,
    key: partial.key ?? partial.id,
    projectId: 'prj',
    type: 'task',
    summary: 'Test',
    status: partial.status ?? 'todo',
    priority: 'medium',
    reporterId: 'usr_rep',
    labels: [],
    watcherIds: partial.watcherIds ?? [],
    rank: 1000,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...partial,
  };
}

describe('issuesDueSoon', () => {
  it('returns assigned open issues due within horizon', () => {
    const today = new Date();
    const inThreeDays = new Date(today);
    inThreeDays.setDate(today.getDate() + 3);
    const due = inThreeDays.toISOString().slice(0, 10);

    const rows = issuesDueSoon(
      [issue({ id: '1', assigneeId: 'me', dueDate: due })],
      'me',
      7,
    );
    expect(rows).toHaveLength(1);
  });

  it('excludes done issues', () => {
    const rows = issuesDueSoon(
      [issue({ id: '1', assigneeId: 'me', status: 'done', dueDate: '2026-12-31' })],
      'me',
    );
    expect(rows).toHaveLength(0);
  });
});

describe('recentChangesForUser', () => {
  it('returns activity on relevant issues excluding self', () => {
    const issues = [
      issue({ id: 'iss_1', assigneeId: 'me', watcherIds: [] }),
    ];
    const activity: ActivityEntry[] = [
      {
        id: 'a1',
        issueId: 'iss_1',
        actorId: 'other',
        kind: 'status',
        message: 'Status changed',
        createdAt: '2026-06-02T00:00:00.000Z',
      },
    ];
    const rows = recentChangesForUser(activity, issues, 'me');
    expect(rows).toHaveLength(1);
    expect(rows[0].activity.message).toBe('Status changed');
  });
});
