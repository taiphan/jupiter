import { describe, expect, it } from 'vitest';
import { issuesToCsv, velocityToCsv } from '@/lib/export/csv';
import type { Issue } from '@/lib/types';

describe('issuesToCsv', () => {
  it('escapes commas and quotes in summary', () => {
    const csv = issuesToCsv(
      [
        {
          id: '1',
          key: 'WEB-1',
          projectId: 'p1',
          type: 'bug',
          summary: 'Fix "login", ASAP',
          status: 'todo',
          priority: 'high',
          reporterId: 'u1',
          labels: ['a', 'b'],
          watcherIds: [],
          rank: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        } satisfies Issue,
      ],
      {
        members: [{ id: 'u1', name: 'Alex', username: 'alex', email: 'a@x.com', avatarColor: '#000' }],
        projects: [{ id: 'p1', key: 'WEB', name: 'Web', type: 'kanban', leadId: 'u1', memberIds: [], createdAt: '', issueCounter: 1 }],
      },
    );
    expect(csv).toContain('"Fix ""login"", ASAP"');
    expect(csv.split('\n')).toHaveLength(2);
  });
});

describe('velocityToCsv', () => {
  it('exports sprint rows', () => {
    const csv = velocityToCsv([
      {
        name: 'Sprint 1',
        committed: 10,
        completed: 8,
        issues: 5,
        done: 4,
        sprint: {
          id: 's1',
          projectId: 'p',
          number: 1,
          name: 'Sprint 1',
          state: 'completed',
        },
      },
    ]);
    expect(csv).toContain('Sprint 1,10,8,5,4');
  });
});
