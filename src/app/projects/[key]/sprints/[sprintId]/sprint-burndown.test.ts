import { describe, expect, it } from 'vitest';

import { computeSprintBurndown } from './sprint-burndown';

// Helper: snap an ISO date string to UTC midnight so off-by-one timezone slips
// don't flake the assertions below.
const utc = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T00:00:00.000Z`);

describe('computeSprintBurndown — sprint-scoped burndown helper (Req 2.1, 2.6)', () => {
  it('emits one point per calendar day from start to end (inclusive)', () => {
    const out = computeSprintBurndown({
      startIso: '2026-05-20T00:00:00.000Z',
      endIso: '2026-05-23T00:00:00.000Z',
      asOf: utc('2026-05-23'),
      issues: [],
    });

    // 3-day window → 4 points (day 0..3).
    expect(out.totalDays).toBe(3);
    expect(out.points).toHaveLength(4);
    expect(out.points[0].date).toBe('2026-05-20');
    expect(out.points[3].date).toBe('2026-05-23');
  });

  it('plots a strict linear ideal series from total → 0 over the sprint window', () => {
    const out = computeSprintBurndown({
      startIso: '2026-06-01T00:00:00.000Z',
      endIso: '2026-06-05T00:00:00.000Z',
      asOf: utc('2026-06-05'),
      issues: [
        { status: 'todo', storyPoints: 10, updatedAt: '2026-06-01T00:00:00.000Z' },
      ],
    });

    expect(out.totalPoints).toBe(10);
    // 4-day window → ideal goes 10, 7.5, 5, 2.5, 0.
    expect(out.points.map((p) => p.ideal)).toEqual([10, 7.5, 5, 2.5, 0]);
  });

  it('decrements remaining as each issue transitions to "done" past its updatedAt', () => {
    const out = computeSprintBurndown({
      startIso: '2026-06-01T00:00:00.000Z',
      endIso: '2026-06-05T00:00:00.000Z',
      asOf: utc('2026-06-05'),
      issues: [
        // 3pt landed on day 1, 2pt landed on day 3. Day 0 still has all 5pt.
        { status: 'done', storyPoints: 3, updatedAt: '2026-06-02T00:00:00.000Z' },
        { status: 'done', storyPoints: 2, updatedAt: '2026-06-04T00:00:00.000Z' },
      ],
    });

    expect(out.totalPoints).toBe(5);
    expect(out.points.map((p) => p.remaining)).toEqual([5, 2, 2, 0, 0]);
  });

  it('leaves "remaining" as null on days strictly after `asOf` (Req 2.6 freeze for completed sprints)', () => {
    const out = computeSprintBurndown({
      startIso: '2026-06-01T00:00:00.000Z',
      endIso: '2026-06-05T00:00:00.000Z',
      // Sprint completed on day 2 — days 3 and 4 must not paint actual data.
      asOf: utc('2026-06-03'),
      issues: [
        // Issue completes at the start of day 1 (cur === updatedAt → counted that day).
        { status: 'done', storyPoints: 4, updatedAt: '2026-06-02T00:00:00.000Z' },
      ],
    });

    // Day 0: nothing burnt yet → 4 remaining.
    // Day 1: issue burns this day → 0 remaining.
    // Day 2: still 0 remaining (asOf inclusive).
    // Days 3 and 4: strictly after asOf → frozen, no actual data.
    expect(out.points[0].remaining).toBe(4);
    expect(out.points[1].remaining).toBe(0);
    expect(out.points[2].remaining).toBe(0);
    expect(out.points[3].remaining).toBeNull();
    expect(out.points[4].remaining).toBeNull();
  });

  it('falls back to a 1-day window when start === end so the chart still renders', () => {
    const out = computeSprintBurndown({
      startIso: '2026-06-10T00:00:00.000Z',
      endIso: '2026-06-10T00:00:00.000Z',
      asOf: utc('2026-06-10'),
      issues: [
        { status: 'todo', storyPoints: 8, updatedAt: '2026-06-10T00:00:00.000Z' },
      ],
    });

    expect(out.totalDays).toBe(1);
    expect(out.points).toHaveLength(2);
    expect(out.points[0].ideal).toBe(8);
    expect(out.points[1].ideal).toBe(0);
  });
});
