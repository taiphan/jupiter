/**
 * Pure helper for the Timeline's Today_Marker (Req 3.9).
 *
 * The Timeline view renders a single vertical line at the current calendar
 * day. This helper converts the wall-clock instant `now` into the pixel
 * offset from the viewport's left edge so the renderer can absolutely
 * position the marker. It also exports the per-scale "pixels per day"
 * constants so the same source of truth drives both the marker and the
 * grid / bar widths in the Timeline component (task 13).
 *
 * **Pure.** No clock reads, no DOM, no I/O. The renderer injects `now` so
 * tests and Storybook can pin the marker deterministically.
 *
 * **Sub-day precision.** The offset is a real number (not floored to whole
 * days), so the marker glides smoothly as the user pans across the day
 * boundary instead of snapping every 24 h.
 *
 * **Negative offsets are intentional.** When `now` is before the viewport
 * starts, the helper returns a negative value. The caller decides how to
 * react — typically by clipping the marker and surfacing a "Jump to today"
 * affordance (Req 3.10).
 *
 * **Why these constants.** `PX_PER_DAY` was picked so each scale fills a
 * comfortable column on a typical desktop screen:
 *
 * | Scale     | px/day | week | 30-day month | 90-day quarter |
 * |-----------|-------:|-----:|-------------:|---------------:|
 * | `week`    |     64 |  448 |        1 920 |          5 760 |
 * | `month`   |     16 |  112 |          480 |          1 440 |
 * | `quarter` |      6 |   42 |          180 |            540 |
 *
 * The Timeline grid and bar widths must use the same constants; otherwise
 * the marker drifts off the day cells when scales change.
 */

/** Time scale chosen for the Timeline's date axis. */
export type TimelineScale = 'week' | 'month' | 'quarter';

/**
 * Pixels-per-day constants shared by the date axis, bar widths, and the
 * Today_Marker. Keep these in sync with the Timeline grid CSS in task 13.
 */
export const PX_PER_DAY: Record<TimelineScale, number> = {
  week: 64,
  month: 16,
  quarter: 6,
};

/** Milliseconds in a day. Avoids the magic number at every call site. */
const MS_PER_DAY = 86_400_000; // 24 * 60 * 60 * 1000

/**
 * Compute the horizontal pixel offset of the Today_Marker from the
 * viewport's left edge, given the current instant, the viewport's start,
 * and the active timeline scale.
 *
 * The formula is `(now - viewportStart) / 1day * PX_PER_DAY[scale]`,
 * preserving sub-day precision so the marker pans smoothly.
 *
 * @param now The current instant. Caller-injected so the helper stays pure
 *   and so the renderer can refresh the marker on view focus per Req 3.9.
 * @param viewportStart The instant pinned to the left edge of the visible
 *   viewport. Typically the start of the visible week / month / quarter.
 * @param scale Which px-per-day constant to use.
 * @returns The pixel offset, sub-day precision. Negative when `now` is
 *   before `viewportStart`. Zero when they are equal.
 */
export function computeTodayPx(
  now: Date,
  viewportStart: Date,
  scale: TimelineScale,
): number {
  const diffMs = now.getTime() - viewportStart.getTime();
  const diffDays = diffMs / MS_PER_DAY;
  return diffDays * PX_PER_DAY[scale];
}
