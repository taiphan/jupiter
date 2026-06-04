import { describe, expect, it } from 'vitest';
import { mapIssueRow, issueToInsert } from '../mappers';
import type { DbIssue } from '../schema';

describe('issue mappers', () => {
  it('round-trips dueDate', () => {
    const row = {
      id: 'iss_1',
      key: 'WEB-1',
      projectId: 'prj_web',
      type: 'task',
      summary: 'Test',
      description: null,
      status: 'todo',
      priority: 'medium',
      assigneeId: null,
      reporterId: 'usr_admin',
      labels: [],
      parentId: null,
      sprintId: null,
      storyPoints: null,
      dueDate: '2026-06-05',
      customFields: null,
      rank: 1000,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    } satisfies DbIssue;

    const issue = mapIssueRow(row);
    expect(issue.dueDate).toBe('2026-06-05');

    const insert = issueToInsert(issue);
    expect(insert.dueDate).toBe('2026-06-05');
  });
});
