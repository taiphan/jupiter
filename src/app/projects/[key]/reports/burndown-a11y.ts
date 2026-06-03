// Pure helpers for the Burndown chart's accessibility surface.
// Extracted from reports-view.tsx so the aria-label summary can be unit-tested
// without booting Recharts / Zustand. See task 8.1, Requirements 2.7 and 10.4.

export type BurndownPoint = {
  date: string;
  ideal: number;
  remaining: number | null;
  label: string;
};

export type BurndownSeries = {
  points: BurndownPoint[];
  totalPoints: number;
  totalDays: number;
};

/**
 * Build the screen-reader summary used as the chart's `aria-label`. Walks the
 * series in reverse to find the most recent day with actual remaining data and
 * compares it to the ideal-line value to surface "on track" / "ahead" / "behind".
 *
 * The function is intentionally framework-free so the same wording can be
 * reused by future server-rendered consumers (e.g. PDF reports).
 */
export function burndownAriaLabel(
  sprintName: string,
  burndown: BurndownSeries,
): string {
  const lastWithRemaining = [...burndown.points]
    .reverse()
    .find((p) => p.remaining !== null);

  if (!lastWithRemaining || lastWithRemaining.remaining === null) {
    return `Burndown chart for ${sprintName}. ${burndown.totalPoints} points committed over ${burndown.totalDays} days. No actual remaining data yet.`;
  }

  const delta = lastWithRemaining.remaining - lastWithRemaining.ideal;
  const trend =
    Math.abs(delta) < 0.5
      ? 'on track with the ideal line'
      : delta > 0
        ? `${delta.toFixed(1)} points behind the ideal`
        : `${Math.abs(delta).toFixed(1)} points ahead of the ideal`;

  return `Burndown chart for ${sprintName}. As of ${lastWithRemaining.label}, ${lastWithRemaining.remaining} points remain versus an ideal of ${lastWithRemaining.ideal}. ${trend}.`;
}
