/**
 * Pure helper for short-cycle detection on the `blocks` graph (Req 4.4).
 *
 * The link service rejects any new `blocks` link whose insertion would form
 * a cycle of length ≤ `maxLen` (default 3). Longer cycles are allowed but
 * flagged in the Timeline view (Req 3.4).
 *
 * The helper is pure — no I/O, no clock dependency — so it can run inside
 * the Zustand `issue-links-store` mutation path and inside fast-check
 * property tests. It treats `is_blocked_by` as the inverse of `blocks` so
 * that callers can pass the canonical "from→to" link rows without
 * pre-normalizing them.
 */

import type { IssueLink, IssueLinkType } from '@/lib/types';

/** A pair of issue ids that participates in a `blocks` relationship. */
export interface BlocksPair {
  /** The blocker — the issue on the "from" side of a `blocks` edge. */
  from: string;
  /** The blocked — the issue on the "to" side of a `blocks` edge. */
  to: string;
}

/**
 * Project a list of canonical link rows into a directed `blocks` graph.
 *
 * `blocks` rows produce an edge `from → to`.
 * `is_blocked_by` rows produce the inverse edge `to → from` so that callers
 * can pass either direction without losing information.
 * Other link types contribute no edges.
 *
 * @internal exported for property tests.
 */
export function buildBlocksGraph(existing: readonly IssueLink[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const addEdge = (from: string, to: string) => {
    let neighbors = graph.get(from);
    if (!neighbors) {
      neighbors = new Set<string>();
      graph.set(from, neighbors);
    }
    neighbors.add(to);
  };
  for (const link of existing) {
    if (link.type === 'blocks') {
      addEdge(link.fromIssueId, link.toIssueId);
    } else if (link.type === ('is_blocked_by' satisfies IssueLinkType)) {
      addEdge(link.toIssueId, link.fromIssueId);
    }
  }
  return graph;
}

/**
 * Find a `blocks` cycle of length ≤ `maxLen` that the proposed `newPair`
 * would create.
 *
 * The cycle is returned as the ordered list of issue ids it visits, starting
 * and ending at `newPair.from`. A length-2 cycle (mutual block) returns
 * `[from, to, from]`. Returns `null` when no such short cycle exists.
 *
 * The helper considers the new edge as if it had already been added: it
 * walks the existing `blocks` graph from `to` and asks whether `from` is
 * reachable in `maxLen - 1` hops or fewer. The total cycle length is then
 * `1 + pathLength`, capped at `maxLen`.
 *
 * @param newPair The `blocks` edge the caller is about to insert.
 * @param existing The current canonical link rows (any types).
 * @param maxLen Maximum cycle length to flag, inclusive. Defaults to 3 per
 *   Requirement 4.4. Values < 2 are clamped to 2 (a self-link is rejected
 *   elsewhere; the smallest possible cycle here is a mutual block).
 */
export function findShortBlocksCycle(
  newPair: BlocksPair,
  existing: readonly IssueLink[],
  maxLen = 3,
): string[] | null {
  const cap = Math.max(2, Math.floor(maxLen));
  const { from, to } = newPair;
  if (from === to) return null; // self-links handled by a separate guard

  const graph = buildBlocksGraph(existing);

  // The new edge contributes 1 hop, so we need a path of at most `cap - 1`
  // existing-edge hops from `to` back to `from`.
  const remaining = cap - 1;
  if (remaining <= 0) return null;

  // Iterative DFS so deeply nested call stacks aren't possible.
  type Frame = { node: string; pathSoFar: string[]; depth: number };
  const initial: Frame = { node: to, pathSoFar: [to], depth: 0 };
  const stack: Frame[] = [initial];

  while (stack.length > 0) {
    const frame = stack.pop()!;
    if (frame.node === from && frame.pathSoFar.length > 1) {
      // Cycle: new edge (from → to) + existing path (to → ... → from).
      return [from, ...frame.pathSoFar];
    }
    if (frame.depth >= remaining) continue;

    const neighbors = graph.get(frame.node);
    if (!neighbors) continue;
    for (const next of neighbors) {
      // Skip nodes already on the path *except* when the next node closes
      // the cycle by returning to `from` — we still want to surface that.
      if (frame.pathSoFar.includes(next) && next !== from) continue;
      stack.push({
        node: next,
        pathSoFar: [...frame.pathSoFar, next],
        depth: frame.depth + 1,
      });
    }
  }

  return null;
}
