// Pure helpers for the Velocity panel's rolling-average reference line
// (Req 2.8) and the "needs more sprints" hint (Req 2.9). Extracted from
// reports-view.tsx so the slice/average/hint decision can be unit-tested
// against the 0/1/2/3/5-completed-sprints fixtures the task requires
// without booting Recharts or Zustand. See task 8.2.
//
// Task 11.6 will eventually replace this with a fuller `lib/derive/velocity.ts`
// that also reconstructs per-sprint completed values from the audit trail.
// Until then, this helper takes the already-aggregated `completed` series
// produced by reports-view's velocity memo.

/** Window size used by the rolling-average reference line per Req 2.8. */
export const VELOCITY_ROLLING_WINDOW = 3;

/** Hint copy mandated by Req 2.9 when the project has fewer than three completed sprints. */
export const VELOCITY_HINT_NEEDS_MORE_SPRINTS =
  'Add at least three completed sprints for a stable velocity reading.';

export interface VelocityRollingSummary {
  /** Total completed sprints supplied as input. */
  total: number;
  /** Sprints actually used for the rolling-average (clamped to total). */
  windowSize: number;
  /**
   * Rolling-average value rounded to the nearest integer, or `null` when
   * there are no completed sprints. The chart's `<ReferenceLine y={...}>`
   * should be hidden when this is `null`.
   */
  rollingAverage: number | null;
  /** True when the project has fewer than VELOCITY_ROLLING_WINDOW completed sprints. */
  needsMoreSprints: boolean;
}

/**
 * Compute the rolling-average summary over the last three completed sprints
 * (Req 2.8). When fewer than three are supplied, the summary's
 * `needsMoreSprints` flag is `true` so the caller can surface the Req 2.9
 * hint inline. The rolling-average is computed over the available window
 * regardless — drawing a reference line at `null`/0 would be misleading,
 * so the caller suppresses the line when `rollingAverage === null`.
 */
export function computeVelocityRolling(
  completedValues: readonly number[],
): VelocityRollingSummary {
  const total = completedValues.length;
  if (total === 0) {
    return {
      total: 0,
      windowSize: 0,
      rollingAverage: null,
      needsMoreSprints: true,
    };
  }
  const window = completedValues.slice(-VELOCITY_ROLLING_WINDOW);
  const sum = window.reduce((acc, v) => acc + v, 0);
  return {
    total,
    windowSize: window.length,
    rollingAverage: Math.round(sum / window.length),
    needsMoreSprints: total < VELOCITY_ROLLING_WINDOW,
  };
}

/**
 * Return the slice of velocity rows that should be rendered as bars in the
 * chart — the last `VELOCITY_ROLLING_WINDOW` completed sprints (Req 2.8).
 * Generic so callers can pass their own row shape without duplication.
 */
export function selectVelocityWindow<T>(rows: readonly T[]): T[] {
  return rows.slice(-VELOCITY_ROLLING_WINDOW);
}
