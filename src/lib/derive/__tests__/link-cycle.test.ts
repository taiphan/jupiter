import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { findShortBlocksCycle, buildBlocksGraph } from '../link-cycle';
import type { IssueLink } from '@/lib/types';

function blocksLink(from: string, to: string, idSuffix = `${from}-${to}`): IssueLink {
  return {
    id: `lnk_${idSuffix}`,
    type: 'blocks',
    fromIssueId: from,
    toIssueId: to,
    createdAt: '2026-06-01T00:00:00.000Z',
    createdBy: 'usr_admin',
  };
}

function inverseLink(from: string, to: string, idSuffix = `${from}-${to}`): IssueLink {
  // `is_blocked_by` reads as: `from` is blocked by `to` → edge `to → from`.
  return {
    id: `lnk_inv_${idSuffix}`,
    type: 'is_blocked_by',
    fromIssueId: from,
    toIssueId: to,
    createdAt: '2026-06-01T00:00:00.000Z',
    createdBy: 'usr_admin',
  };
}

describe('buildBlocksGraph', () => {
  it('emits one edge per blocks row in the given direction', () => {
    const graph = buildBlocksGraph([blocksLink('A', 'B'), blocksLink('B', 'C')]);
    expect(graph.get('A')).toEqual(new Set(['B']));
    expect(graph.get('B')).toEqual(new Set(['C']));
    expect(graph.has('C')).toBe(false);
  });

  it('treats is_blocked_by as the inverse blocks edge', () => {
    // "A is_blocked_by B" → edge B → A
    const graph = buildBlocksGraph([inverseLink('A', 'B')]);
    expect(graph.get('B')).toEqual(new Set(['A']));
    expect(graph.has('A')).toBe(false);
  });

  it('ignores non-blocks link types', () => {
    const link: IssueLink = {
      id: 'lnk_rel',
      type: 'relates_to',
      fromIssueId: 'A',
      toIssueId: 'B',
      createdAt: '2026-06-01T00:00:00.000Z',
      createdBy: 'usr_admin',
    };
    const graph = buildBlocksGraph([link]);
    expect(graph.size).toBe(0);
  });
});

describe('findShortBlocksCycle — examples', () => {
  it('returns null when there is no path back', () => {
    const existing = [blocksLink('B', 'C')];
    expect(findShortBlocksCycle({ from: 'A', to: 'B' }, existing)).toBeNull();
  });

  it('detects a length-2 mutual block', () => {
    // Existing: B → A. Adding A → B closes a length-2 cycle.
    const existing = [blocksLink('B', 'A')];
    const cycle = findShortBlocksCycle({ from: 'A', to: 'B' }, existing);
    expect(cycle).toEqual(['A', 'B', 'A']);
  });

  it('detects a length-3 cycle', () => {
    // Existing: B → C, C → A. Adding A → B closes a length-3 cycle.
    const existing = [blocksLink('B', 'C'), blocksLink('C', 'A')];
    const cycle = findShortBlocksCycle({ from: 'A', to: 'B' }, existing);
    expect(cycle).toEqual(['A', 'B', 'C', 'A']);
  });

  it('does not flag a length-4 cycle when maxLen is 3 (default)', () => {
    // Existing: B → C, C → D, D → A. Adding A → B would close a length-4 cycle.
    const existing = [blocksLink('B', 'C'), blocksLink('C', 'D'), blocksLink('D', 'A')];
    expect(findShortBlocksCycle({ from: 'A', to: 'B' }, existing)).toBeNull();
  });

  it('detects a length-3 cycle through an inverse link', () => {
    // "C is_blocked_by B" → edge B → C. "A is_blocked_by C" → edge C → A.
    // Adding blocks A → B closes a length-3 cycle: A → B → C → A.
    const existing = [inverseLink('C', 'B'), inverseLink('A', 'C')];
    const cycle = findShortBlocksCycle({ from: 'A', to: 'B' }, existing);
    expect(cycle).toEqual(['A', 'B', 'C', 'A']);
  });

  it('returns null for a self-link (handled separately)', () => {
    expect(findShortBlocksCycle({ from: 'A', to: 'A' }, [])).toBeNull();
  });

  it('respects a custom maxLen', () => {
    // Length-4 cycle through D should be detected when maxLen = 4.
    const existing = [blocksLink('B', 'C'), blocksLink('C', 'D'), blocksLink('D', 'A')];
    const cycle = findShortBlocksCycle({ from: 'A', to: 'B' }, existing, 4);
    expect(cycle).toEqual(['A', 'B', 'C', 'D', 'A']);
  });
});

describe('findShortBlocksCycle — Property 4 (no length-≤3 blocks cycle slips through)', () => {
  // Random small graphs (≤ 8 nodes) with up to 12 random `blocks` edges.
  // For every (newFrom, newTo) pair, brute-force check whether a length-≤3
  // cycle exists; assert the helper agrees on existence/non-existence.
  const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const idArb = fc.constantFrom(...ids);
  const edgeArb = fc
    .tuple(idArb, idArb)
    .filter(([a, b]) => a !== b)
    .map(([from, to]) => blocksLink(from, to, `${from}-${to}-${Math.random()}`));

  const existingArb = fc.array(edgeArb, { maxLength: 12 });

  /**
   * Brute-force: does adding `from → to` create a cycle of length ≤ maxLen?
   * Returns true when such a cycle exists.
   */
  function bruteHasShortCycle(
    from: string,
    to: string,
    edges: ReadonlyArray<{ from: string; to: string }>,
    maxLen: number,
  ): boolean {
    if (from === to) return false;
    const adj = new Map<string, Set<string>>();
    for (const e of edges) {
      let s = adj.get(e.from);
      if (!s) {
        s = new Set();
        adj.set(e.from, s);
      }
      s.add(e.to);
    }
    // BFS from `to`, count hops; new edge contributes 1 hop, so we need a
    // path of (maxLen - 1) hops or fewer back to `from`.
    const remaining = maxLen - 1;
    let frontier: Array<{ node: string; depth: number }> = [{ node: to, depth: 0 }];
    while (frontier.length) {
      const next: Array<{ node: string; depth: number }> = [];
      for (const { node, depth } of frontier) {
        if (node === from) return true;
        if (depth >= remaining) continue;
        const neighbors = adj.get(node);
        if (!neighbors) continue;
        for (const n of neighbors) {
          next.push({ node: n, depth: depth + 1 });
        }
      }
      frontier = next;
    }
    return false;
  }

  /**
   * Validates: Requirements 4.4 — the helper rejects every length-≤3 cycle
   * that the brute-force search detects, and never reports a false positive.
   */
  it('agrees with brute-force search across random graphs and proposals', () => {
    fc.assert(
      fc.property(existingArb, idArb, idArb, fc.integer({ min: 2, max: 4 }), (existing, from, to, maxLen) => {
        const expected = bruteHasShortCycle(
          from,
          to,
          existing
            .filter((l) => l.type === 'blocks')
            .map((l) => ({ from: l.fromIssueId, to: l.toIssueId })),
          maxLen,
        );
        const actual = findShortBlocksCycle({ from, to }, existing, maxLen);
        const detected = actual !== null;
        if (detected !== expected) return false;

        // If a cycle is reported, it must (a) start and end at `from`,
        // (b) have its second node be `to`, (c) have length ≤ maxLen + 1
        // nodes (== maxLen edges including the new one), and (d) every
        // intermediate edge must exist in the graph.
        if (actual) {
          if (actual[0] !== from) return false;
          if (actual[actual.length - 1] !== from) return false;
          if (actual[1] !== to) return false;
          if (actual.length - 1 > maxLen) return false;
          const edgeSet = new Set(
            existing
              .filter((l) => l.type === 'blocks')
              .map((l) => `${l.fromIssueId}->${l.toIssueId}`),
          );
          for (let i = 1; i < actual.length - 1; i++) {
            const a = actual[i];
            const b = actual[i + 1];
            if (!edgeSet.has(`${a}->${b}`)) return false;
          }
        }
        return true;
      }),
      { numRuns: 300 },
    );
  });
});
