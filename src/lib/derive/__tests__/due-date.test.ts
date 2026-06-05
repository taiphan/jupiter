import { describe, expect, it } from 'vitest';
import { isOverdue, compareDueDates } from '../due-date';
import type { Issue } from '@/lib/types';

const base = (patch: Partial<Issue>): Issue => ({
  id: '1',
  key: 'T-1',
  projectId: 'p',
  type: 'task',
  summary: 'x',
  status: 'todo',
  priority: 'medium',
  reporterId: 'u',
  labels: [],
  watcherIds: [],
  rank: 0,
  createdAt: '',
  updatedAt: '',
  ...patch,
});

describe('isOverdue', () => {
  it('returns false when no due date', () => {
    expect(isOverdue(base({}))).toBe(false);
  });

  it('returns false when done', () => {
    expect(isOverdue(base({ dueDate: '2020-01-01', status: 'done' }))).toBe(false);
  });

  it('returns true for past due open issues', () => {
    expect(isOverdue(base({ dueDate: '2020-01-01', status: 'in-progress' }))).toBe(true);
  });
});

describe('compareDueDates', () => {
  it('sorts issues with due dates before those without', () => {
    const withDue = base({ dueDate: '2026-06-10' });
    const without = base({ id: '2', key: 'T-2' });
    expect(compareDueDates(withDue, without)).toBeLessThan(0);
  });
});
