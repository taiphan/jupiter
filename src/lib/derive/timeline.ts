/**
 * Pure helpers for the Timeline view (Req 3.2).
 *
 * The Timeline page draws one row per epic with a bar that spans the work
 * its child stories represent: from the earliest child `startDate` (falling
 * back to `createdAt` when start is unset) to the latest child `dueDate`.
 * `computeEpicSpan` is the deterministic, side-effect-free helper that
 * computes that range so the renderer, integration tests, and `fast-check`
 * property tests can all share the same source of truth.
 *
 * **Empty / partial spans.** Per Req 3.2 an epic with no children renders a
 * zero-width placeholder bar at the epic's own `dueDate` (or `createdAt`).
 * That placeholder is a UI concern — this helper's contract is "no usable
 * span" → returns `null`. The renderer is responsible for rendering the
 * placeholder when the helper returns `null`. We treat the same way the
 * case where no child carries a `dueDate`: a span is undefined without an
 * end, even though a start could be derived from `createdAt`.
 *
 * **Why no `now` parameter.** Task 11.2 calls for "Pure; injected `now`",
 * but the span depends only on the input issues' own dates — no clock read
 * is needed to compute it. We therefore omit `now` from the signature in
 * favor of the cleanest contract: feed in issues, get back a span. The
 * Today_Marker (Req 3.9) takes its `now` from a separate helper
 * (`computeTodayPx`, task 11.3).
 *
 * **Input shape.** The helper accepts narrow structural types because the
 * full `Issue` type carries a lot of unrelated fields. TypeScript's
 * structural typing allows callers to pass full `Issue` objects directly —
 * the extra properties are ignored. Both the epic and its children share
 * the same minimal shape.
 *
 * **Why the epic is in the signature even though it's currently unused.**
 * The task text specifies `computeEpicSpan(epic, children)`, and the
 * design document mirrors that contract. We keep the epic parameter so
 * future iterations can fall back to the epic's own dates without
 * breaking call sites; today the helper does not consult it.
 */

/**
 * Minimal shape required by the timeline span helper. Extra properties on
 * the caller's object (e.g. a full `Issue`) are ignored thanks to
 * structural typing.
 */
export interface TimelineChild {
  /** Optional explicit start, ISO 8601 string. */
  startDate?: string;
  /** Optional due date, ISO 8601 string. The bar's right edge. */
  dueDate?: string;
  /**
   * Always-present creation timestamp, ISO 8601 string. Acts as the
   * fallback start when `startDate` is unset.
   */
  createdAt: string;
}

/** Same shape as a child for now; declared separately for clarity at call sites. */
export type TimelineEpic = TimelineChild;

/** A computed span between two `Date` instants. */
export interface EpicSpan {
  /** Earliest start (or `createdAt` fallback) across the epic's children. */
  start: Date;
  /** Latest `dueDate` across the epic's children. */
  end: Date;
}

/** Parse an ISO 8601 string, returning `null` on failure rather than throwing. */
function toDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

/**
 * Compute the timeline span for one epic.
 *
 * @param _epic The epic itself. Currently unused; kept on the signature for
 *   forward compatibility (see file header) and to match Req 3.2's renderer
 *   contract.
 * @param children The epic's child stories (or any issues whose dates
 *   should contribute to the span).
 * @returns `{ start, end }` where `start` is the earliest of each child's
 *   `startDate ?? createdAt` and `end` is the latest of each child's
 *   `dueDate`. Returns `null` when there are no children, when no child
 *   carries a usable `dueDate`, or when no child carries a usable start
 *   candidate (which is impossible in practice because `createdAt` is
 *   required, but defensively handled in case of malformed data).
 */
export function computeEpicSpan(
  _epic: TimelineEpic,
  children: readonly TimelineChild[],
): EpicSpan | null {
  if (children.length === 0) return null;

  let earliestStart: Date | null = null;
  let latestEnd: Date | null = null;

  for (const child of children) {
    // Start candidate: explicit startDate if present, else createdAt.
    const startCandidate = toDate(child.startDate) ?? toDate(child.createdAt);
    if (startCandidate && (earliestStart === null || startCandidate < earliestStart)) {
      earliestStart = startCandidate;
    }

    const due = toDate(child.dueDate);
    if (due && (latestEnd === null || due > latestEnd)) {
      latestEnd = due;
    }
  }

  if (earliestStart === null || latestEnd === null) return null;
  return { start: earliestStart, end: latestEnd };
}

/** Minimal issue shape for building timeline row hierarchy. */
export interface TimelineRowIssue {
  id: string;
  key: string;
  type: string;
  parentId?: string;
}

export interface TimelineRow<T extends TimelineRowIssue = TimelineRowIssue> {
  issue: T;
  depth: number;
}

/**
 * Build a hierarchical row list for the Gantt view: roots first (epics before others),
 * then children recursively. Respects `collapsed` parent ids.
 */
export function buildTimelineRows<T extends TimelineRowIssue>(
  issues: readonly T[],
  collapsed: ReadonlySet<string> = new Set(),
): TimelineRow<T>[] {
  const byId = new Map(issues.map((i) => [i.id, i]));
  const byParent = new Map<string, T[]>();
  for (const issue of issues) {
    if (!issue.parentId || !byId.has(issue.parentId)) continue;
    const list = byParent.get(issue.parentId) ?? [];
    list.push(issue);
    byParent.set(issue.parentId, list);
  }

  const result: TimelineRow<T>[] = [];
  const visited = new Set<string>();

  const walk = (issue: T, depth: number) => {
    if (visited.has(issue.id)) return;
    visited.add(issue.id);
    result.push({ issue, depth });
    if (collapsed.has(issue.id)) return;
    const children = byParent.get(issue.id) ?? [];
    children.sort((a, b) => a.key.localeCompare(b.key));
    for (const child of children) walk(child, depth + 1);
  };

  const roots = issues.filter((i) => !i.parentId || !byId.has(i.parentId));
  roots.sort((a, b) => {
    if (a.type === 'epic' && b.type !== 'epic') return -1;
    if (b.type === 'epic' && a.type !== 'epic') return 1;
    return a.key.localeCompare(b.key);
  });

  for (const root of roots) walk(root, 0);
  return result;
}
