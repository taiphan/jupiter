import { describe, expect, it } from 'vitest';
import {
  computeVelocityRolling,
  selectVelocityWindow,
  VELOCITY_HINT_NEEDS_MORE_SPRINTS,
  VELOCITY_ROLLING_WINDOW,
} from './velocity-rolling';

// Task 8.2 verification: render decisions with fixtures of 0, 1, 2, 3, 5
// completed sprints. The `computeVelocityRolling` + `selectVelocityWindow`
// pair drives the bar chart's data slice, the rolling-average reference
// line, the badge, and the "needs more sprints" hint in reports-view.tsx.
//
// Validates: Requirements 2.8, 2.9.

interface Row {
  sprintId: string;
  completed: number;
}

const fixture = (completedValues: number[]): Row[] =>
  completedValues.map((completed, i) => ({ sprintId: `spr-${i + 1}`, completed }));

describe('VELOCITY_ROLLING_WINDOW', () => {
  it('is 3 — Req 2.8 mandates the last three completed sprints', () => {
    expect(VELOCITY_ROLLING_WINDOW).toBe(3);
  });
});

describe('selectVelocityWindow — Req 2.8 slice by -3', () => {
  it('returns an empty array for 0 completed sprints', () => {
    expect(selectVelocityWindow(fixture([]))).toEqual([]);
  });

  it('returns the only sprint for 1 completed sprint', () => {
    const rows = fixture([8]);
    expect(selectVelocityWindow(rows)).toEqual(rows);
  });

  it('returns both sprints for 2 completed sprints', () => {
    const rows = fixture([8, 12]);
    expect(selectVelocityWindow(rows)).toEqual(rows);
  });

  it('returns all 3 sprints for 3 completed sprints', () => {
    const rows = fixture([8, 12, 10]);
    expect(selectVelocityWindow(rows)).toEqual(rows);
  });

  it('returns only the most recent 3 for 5 completed sprints', () => {
    const rows = fixture([5, 9, 8, 12, 10]);
    expect(selectVelocityWindow(rows)).toEqual([
      { sprintId: 'spr-3', completed: 8 },
      { sprintId: 'spr-4', completed: 12 },
      { sprintId: 'spr-5', completed: 10 },
    ]);
  });
});

describe('computeVelocityRolling — Req 2.8 reference-line + Req 2.9 hint', () => {
  it('0 completed sprints: hides the reference line and surfaces the Req 2.9 hint', () => {
    const sut = computeVelocityRolling([]);
    expect(sut).toEqual({
      total: 0,
      windowSize: 0,
      rollingAverage: null,
      needsMoreSprints: true,
    });
  });

  it('1 completed sprint: averages the available sprint, still flags needsMoreSprints', () => {
    const sut = computeVelocityRolling([8]);
    expect(sut.rollingAverage).toBe(8);
    expect(sut.windowSize).toBe(1);
    expect(sut.needsMoreSprints).toBe(true);
  });

  it('2 completed sprints: averages both, still flags needsMoreSprints', () => {
    const sut = computeVelocityRolling([8, 12]);
    expect(sut.rollingAverage).toBe(10);
    expect(sut.windowSize).toBe(2);
    expect(sut.needsMoreSprints).toBe(true);
  });

  it('3 completed sprints: averages all three and clears the hint flag', () => {
    const sut = computeVelocityRolling([8, 12, 10]);
    expect(sut.rollingAverage).toBe(10);
    expect(sut.windowSize).toBe(3);
    expect(sut.needsMoreSprints).toBe(false);
  });

  it('5 completed sprints: averages only the last three (Req 2.8)', () => {
    // Average of [8, 12, 10] = 10; the older 5 and 9 are dropped.
    const sut = computeVelocityRolling([5, 9, 8, 12, 10]);
    expect(sut.rollingAverage).toBe(10);
    expect(sut.windowSize).toBe(3);
    expect(sut.total).toBe(5);
    expect(sut.needsMoreSprints).toBe(false);
  });

  it('rounds the rolling average to the nearest integer', () => {
    // (7 + 8 + 8) / 3 = 7.66… → 8
    expect(computeVelocityRolling([7, 8, 8]).rollingAverage).toBe(8);
    // (1 + 2 + 2) / 3 = 1.66… → 2
    expect(computeVelocityRolling([1, 2, 2]).rollingAverage).toBe(2);
  });
});

describe('VELOCITY_HINT_NEEDS_MORE_SPRINTS', () => {
  it('matches the wording mandated by Req 2.9', () => {
    expect(VELOCITY_HINT_NEEDS_MORE_SPRINTS).toBe(
      'Add at least three completed sprints for a stable velocity reading.',
    );
  });
});
