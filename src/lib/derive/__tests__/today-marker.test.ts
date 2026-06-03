import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeTodayPx, PX_PER_DAY, type TimelineScale } from '../today-marker';

const SCALES: TimelineScale[] = ['week', 'month', 'quarter'];

// A stable reference instant used as `viewportStart` across the suite.
const START = new Date('2026-06-01T00:00:00.000Z');

/** Add `days` calendar days (sub-day allowed) to `base`. */
function plusDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

describe('PX_PER_DAY constants (Req 3.9)', () => {
  it('exposes the documented px-per-day for every scale', () => {
    expect(PX_PER_DAY.week).toBe(64);
    expect(PX_PER_DAY.month).toBe(16);
    expect(PX_PER_DAY.quarter).toBe(6);
  });
});

describe('computeTodayPx — examples (Req 3.9)', () => {
  it('returns 0 when now equals viewportStart at any scale', () => {
    for (const scale of SCALES) {
      expect(computeTodayPx(START, START, scale)).toBe(0);
    }
  });

  it('returns 64 when now is one day after viewportStart at the week scale', () => {
    expect(computeTodayPx(plusDays(START, 1), START, 'week')).toBe(64);
  });

  it('returns 16 when now is one day after viewportStart at the month scale', () => {
    expect(computeTodayPx(plusDays(START, 1), START, 'month')).toBe(16);
  });

  it('returns 6 when now is one day after viewportStart at the quarter scale', () => {
    expect(computeTodayPx(plusDays(START, 1), START, 'quarter')).toBe(6);
  });

  it('returns a negative offset when now is before viewportStart', () => {
    // Two days earlier at the week scale → -128.
    const now = plusDays(START, -2);
    expect(computeTodayPx(now, START, 'week')).toBe(-128);
    // Same direction, different scale.
    expect(computeTodayPx(now, START, 'month')).toBe(-32);
    expect(computeTodayPx(now, START, 'quarter')).toBe(-12);
  });

  it('preserves sub-day precision: 12 hours after start at the week scale ≈ 32', () => {
    const halfDay = new Date(START.getTime() + 12 * 60 * 60 * 1000);
    // 0.5 days * 64 px/day = 32 px (exact in IEEE 754 here).
    expect(computeTodayPx(halfDay, START, 'week')).toBeCloseTo(32, 10);
  });

  it('scales linearly with the day delta', () => {
    // A full week later at the week scale → 7 * 64 = 448.
    expect(computeTodayPx(plusDays(START, 7), START, 'week')).toBe(448);
    // A 30-day month later at the month scale → 30 * 16 = 480.
    expect(computeTodayPx(plusDays(START, 30), START, 'month')).toBe(480);
    // A 90-day quarter later at the quarter scale → 90 * 6 = 540.
    expect(computeTodayPx(plusDays(START, 90), START, 'quarter')).toBe(540);
  });
});

describe('computeTodayPx — invariants', () => {
  // Generate instants inside a stable window so timestamps stay realistic.
  const dateArb = fc
    .integer({
      min: Date.parse('2024-01-01T00:00:00.000Z'),
      max: Date.parse('2030-01-01T00:00:00.000Z'),
    })
    .map((ms) => new Date(ms));
  const scaleArb = fc.constantFrom<TimelineScale>('week', 'month', 'quarter');

  /**
   * Validates: Requirements 3.9 — the pixel offset is `(now - viewportStart)
   * in days × PX_PER_DAY[scale]`, sub-day precision, with sign preserved
   * when `now` is before `viewportStart`.
   */
  it('matches the (diffDays * PX_PER_DAY) formula across random inputs', () => {
    fc.assert(
      fc.property(dateArb, dateArb, scaleArb, (now, viewportStart, scale) => {
        const expected = ((now.getTime() - viewportStart.getTime()) / 86_400_000) * PX_PER_DAY[scale];
        const actual = computeTodayPx(now, viewportStart, scale);
        // Use Object.is so NaN/Infinity comparisons are identity-based.
        return Object.is(actual, expected);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Validates: Requirements 3.9 — `now == viewportStart` always pins the
   * marker to the viewport's left edge regardless of scale.
   */
  it('is zero exactly when now equals viewportStart', () => {
    fc.assert(
      fc.property(dateArb, scaleArb, (instant, scale) => {
        return computeTodayPx(instant, instant, scale) === 0;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 3.9 — the offset's sign matches the sign of
   * `(now - viewportStart)`, so callers can branch on negativity to render
   * the "Jump to today" affordance.
   */
  it('returns a negative offset iff now is before viewportStart', () => {
    fc.assert(
      fc.property(dateArb, dateArb, scaleArb, (now, viewportStart, scale) => {
        const px = computeTodayPx(now, viewportStart, scale);
        if (now.getTime() === viewportStart.getTime()) return px === 0;
        if (now.getTime() < viewportStart.getTime()) return px < 0;
        return px > 0;
      }),
      { numRuns: 200 },
    );
  });
});
