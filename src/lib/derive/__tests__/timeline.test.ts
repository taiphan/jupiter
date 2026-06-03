import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeEpicSpan, type TimelineChild, type TimelineEpic } from '../timeline';

const epic: TimelineEpic = { createdAt: '2026-06-01T00:00:00.000Z' };

function child(partial: Partial<TimelineChild> & { createdAt: string }): TimelineChild {
  return partial;
}

describe('computeEpicSpan — examples (Req 3.2)', () => {
  it('returns null when the epic has no children', () => {
    expect(computeEpicSpan(epic, [])).toBeNull();
  });

  it('returns null when no child carries a dueDate', () => {
    // Children have createdAt (so a start could be derived) but no due date.
    // Without an end the span is undefined.
    const children = [
      child({ createdAt: '2026-06-02T00:00:00.000Z' }),
      child({ createdAt: '2026-06-03T00:00:00.000Z', startDate: '2026-06-04T00:00:00.000Z' }),
    ];
    expect(computeEpicSpan(epic, children)).toBeNull();
  });

  it('returns the earliest start (or createdAt fallback) and the latest dueDate', () => {
    const children = [
      // child A: startDate sits before child B's createdAt → contributes start.
      child({ createdAt: '2026-06-10T00:00:00.000Z', startDate: '2026-06-05T00:00:00.000Z', dueDate: '2026-06-20T00:00:00.000Z' }),
      // child B: no startDate, createdAt is later than A's startDate.
      child({ createdAt: '2026-06-12T00:00:00.000Z', dueDate: '2026-06-25T00:00:00.000Z' }),
      // child C: latest due date.
      child({ createdAt: '2026-06-15T00:00:00.000Z', startDate: '2026-06-15T00:00:00.000Z', dueDate: '2026-06-30T00:00:00.000Z' }),
    ];
    const span = computeEpicSpan(epic, children);
    expect(span).not.toBeNull();
    expect(span!.start.toISOString()).toBe('2026-06-05T00:00:00.000Z');
    expect(span!.end.toISOString()).toBe('2026-06-30T00:00:00.000Z');
  });

  it('prefers explicit startDate over createdAt when both are present', () => {
    const children = [
      child({
        createdAt: '2026-06-10T00:00:00.000Z',
        startDate: '2026-06-01T00:00:00.000Z',
        dueDate: '2026-06-30T00:00:00.000Z',
      }),
    ];
    const span = computeEpicSpan(epic, children);
    expect(span!.start.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('falls back to createdAt for start when startDate is missing', () => {
    const children = [
      child({ createdAt: '2026-06-08T00:00:00.000Z', dueDate: '2026-06-30T00:00:00.000Z' }),
    ];
    const span = computeEpicSpan(epic, children);
    expect(span!.start.toISOString()).toBe('2026-06-08T00:00:00.000Z');
    expect(span!.end.toISOString()).toBe('2026-06-30T00:00:00.000Z');
  });

  it('tolerates a single child with both bounds present', () => {
    const children = [
      child({
        createdAt: '2026-06-15T00:00:00.000Z',
        startDate: '2026-06-12T00:00:00.000Z',
        dueDate: '2026-06-22T00:00:00.000Z',
      }),
    ];
    const span = computeEpicSpan(epic, children);
    expect(span!.start.toISOString()).toBe('2026-06-12T00:00:00.000Z');
    expect(span!.end.toISOString()).toBe('2026-06-22T00:00:00.000Z');
  });

  it('ignores malformed date strings on children', () => {
    const children = [
      // Garbage startDate and dueDate — should be skipped, falling back to createdAt for start.
      child({ createdAt: '2026-06-10T00:00:00.000Z', startDate: 'not-a-date', dueDate: 'also-not-a-date' }),
      child({ createdAt: '2026-06-12T00:00:00.000Z', dueDate: '2026-06-25T00:00:00.000Z' }),
    ];
    const span = computeEpicSpan(epic, children);
    expect(span!.start.toISOString()).toBe('2026-06-10T00:00:00.000Z');
    expect(span!.end.toISOString()).toBe('2026-06-25T00:00:00.000Z');
  });
});

describe('computeEpicSpan — invariants', () => {
  // Generate dates inside a stable window so timestamps are realistic.
  const dateArb = fc
    .integer({ min: Date.parse('2024-01-01T00:00:00.000Z'), max: Date.parse('2030-01-01T00:00:00.000Z') })
    .map((ms) => new Date(ms).toISOString());

  const childArb: fc.Arbitrary<TimelineChild> = fc.record(
    {
      createdAt: dateArb,
      startDate: fc.option(dateArb, { nil: undefined }),
      dueDate: fc.option(dateArb, { nil: undefined }),
    },
    { requiredKeys: ['createdAt'] },
  );

  /**
   * Validates: Requirements 3.2 — the returned end equals the maximum of
   * each child's dueDate, the returned start equals the minimum of each
   * child's startDate-or-createdAt, and the helper returns `null` exactly
   * when no child carries a usable dueDate (or there are no children).
   *
   * Note: the helper does **not** enforce `start <= end`. If a child has a
   * dueDate earlier than its startDate (data error), the helper passes
   * that through to the renderer.
   */
  it('returned span agrees with the candidate sets across random inputs', () => {
    fc.assert(
      fc.property(fc.array(childArb, { maxLength: 12 }), (children) => {
        const span = computeEpicSpan(epic, children);

        const dueCandidates = children
          .map((c) => Date.parse(c.dueDate ?? ''))
          .filter((ms) => !Number.isNaN(ms));

        if (dueCandidates.length === 0 || children.length === 0) {
          return span === null;
        }

        if (span === null) return false;

        // End must equal the maximum due-candidate.
        const maxDue = Math.max(...dueCandidates);
        if (span.end.getTime() !== maxDue) return false;

        // Start must equal the minimum start-candidate (startDate ?? createdAt).
        const startCandidates = children
          .map((c) => {
            const s = Date.parse(c.startDate ?? '');
            if (!Number.isNaN(s)) return s;
            const cr = Date.parse(c.createdAt);
            return Number.isNaN(cr) ? null : cr;
          })
          .filter((ms): ms is number => ms !== null);
        if (startCandidates.length === 0) return false;
        const minStart = Math.min(...startCandidates);
        return span.start.getTime() === minStart;
      }),
      { numRuns: 200 },
    );
  });
});
