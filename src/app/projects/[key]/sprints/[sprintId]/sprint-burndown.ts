// Pure helper for computing the per-day burndown series of a single sprint.
// Extracted from `sprint-board-view.tsx` so it can be unit-tested without
// pulling Recharts, Next.js navigation, or Zustand into the test runtime.
//
// See Requirements 2.1 (active or completed sprint surfaces the chart) and
// 2.6 (completed sprints freeze data at `completedAt`).

import type { BurndownPoint, BurndownSeries } from '../../reports/burndown-a11y';

/** Minimal slice of an Issue that the burndown computation cares about. */
export interface BurndownInputIssue {
  status: string;
  storyPoints?: number;
  updatedAt: string;
}

export interface ComputeBurndownInput {
  startIso: string;
  endIso: string;
  /** "Now" — completed sprints freeze data at `completedAt`, active sprints pass current time. */
  asOf: Date;
  issues: BurndownInputIssue[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compute the daily burndown series for a sprint.
 *
 * The function is pure (no clock or DOM dependency), which keeps the chart's
 * input deterministic across renders and lets tests assert exact series shape.
 */
export function computeSprintBurndown(input: ComputeBurndownInput): BurndownSeries {
  const start = new Date(input.startIso);
  const end = new Date(input.endIso);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
  const totalPoints = input.issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

  const points: BurndownPoint[] = [];
  for (let d = 0; d <= totalDays; d++) {
    const cur = new Date(start.getTime() + d * MS_PER_DAY);
    const ideal = Math.max(0, totalPoints - (totalPoints * d) / totalDays);
    const isPastOrToday = cur <= input.asOf;

    let remaining: number | null = null;
    if (isPastOrToday) {
      const burnt = input.issues
        .filter((i) => i.status === 'done' && new Date(i.updatedAt) <= cur)
        .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
      remaining = Math.max(0, totalPoints - burnt);
    }

    points.push({
      date: cur.toISOString().slice(0, 10),
      label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ideal: Math.round(ideal * 10) / 10,
      remaining,
    });
  }

  return { points, totalPoints, totalDays };
}
