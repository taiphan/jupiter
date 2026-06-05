import { describe, expect, it } from 'vitest';
import { buildTimelineRows } from '../timeline';

describe('buildTimelineRows', () => {
  const issues = [
    { id: 'e1', key: 'WEB-1', type: 'epic', parentId: undefined },
    { id: 's1', key: 'WEB-2', type: 'story', parentId: 'e1' },
    { id: 't1', key: 'WEB-3', type: 'subtask', parentId: 's1' },
    { id: 's2', key: 'WEB-4', type: 'story', parentId: undefined },
    { id: 't2', key: 'WEB-5', type: 'subtask', parentId: 's2' },
  ];

  it('nests epic → story → subtask', () => {
    const rows = buildTimelineRows(issues);
    expect(rows.map((r) => r.issue.key)).toEqual(['WEB-1', 'WEB-2', 'WEB-3', 'WEB-4', 'WEB-5']);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 0, 1]);
  });

  it('respects collapsed parents', () => {
    const rows = buildTimelineRows(issues, new Set(['e1']));
    expect(rows.map((r) => r.issue.key)).toEqual(['WEB-1', 'WEB-4', 'WEB-5']);
  });
});
