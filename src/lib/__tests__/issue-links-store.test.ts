import { describe, expect, it, beforeEach } from 'vitest';
import { useIssueLinksStore } from '../issue-links-store';
import { useIssuesStore } from '../issues-store';
import type { Issue } from '../types';

const ACTOR = 'usr_admin';

function makeIssue(id: string, key: string, overrides: Partial<Issue> = {}): Issue {
  return {
    id,
    key,
    projectId: 'prj_test',
    type: 'task',
    summary: `Test ${key}`,
    status: 'todo',
    priority: 'medium',
    reporterId: ACTOR,
    labels: [],
    watcherIds: [],
    rank: 1000,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function seed(issues: Issue[]) {
  useIssuesStore.setState({
    issues,
    comments: [],
    activity: [],
    attachments: [],
  });
  useIssueLinksStore.getState().reset();
}

describe('useIssueLinksStore', () => {
  beforeEach(() => {
    seed([makeIssue('iss_a', 'TST-1'), makeIssue('iss_b', 'TST-2'), makeIssue('iss_c', 'TST-3')]);
  });

  it('rejects a self-link with reason "self_link"', () => {
    const result = useIssueLinksStore
      .getState()
      .addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_a', type: 'blocks' }, ACTOR);
    expect(result).toEqual({ ok: false, reason: 'self_link' });
    expect(useIssueLinksStore.getState().links).toHaveLength(0);
  });

  it('rejects a link to an unknown issue', () => {
    const result = useIssueLinksStore
      .getState()
      .addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_missing', type: 'relates_to' }, ACTOR);
    expect(result).toEqual({ ok: false, reason: 'unknown_issue' });
  });

  it('persists a successful link and appends an activity entry to both issues', () => {
    const result = useIssueLinksStore
      .getState()
      .addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR);
    expect(result.ok).toBe(true);
    expect(useIssueLinksStore.getState().links).toHaveLength(1);

    const activity = useIssuesStore.getState().activity;
    const aActivity = activity.filter((e) => e.issueId === 'iss_a' && e.kind === 'link-added');
    const bActivity = activity.filter((e) => e.issueId === 'iss_b' && e.kind === 'link-added');
    expect(aActivity).toHaveLength(1);
    expect(bActivity).toHaveLength(1);
    expect(aActivity[0].message).toMatch(/blocks.*TST-2/i);
    expect(bActivity[0].message).toMatch(/is blocked by.*TST-1/i);
  });

  it('rejects a duplicate pair regardless of direction', () => {
    const store = useIssueLinksStore.getState();
    const first = store.addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR);
    expect(first.ok).toBe(true);

    // Same direction, same type.
    const dup1 = useIssueLinksStore
      .getState()
      .addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR);
    expect(dup1).toMatchObject({ ok: false, reason: 'duplicate_pair' });

    // Inverse expression of the same logical link.
    const dup2 = useIssueLinksStore
      .getState()
      .addLink({ fromIssueId: 'iss_b', toIssueId: 'iss_a', type: 'is_blocked_by' }, ACTOR);
    expect(dup2).toMatchObject({ ok: false, reason: 'duplicate_pair' });

    expect(useIssueLinksStore.getState().links).toHaveLength(1);
  });

  it('allows different link types between the same pair', () => {
    const store = useIssueLinksStore.getState();
    expect(
      store.addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR).ok,
    ).toBe(true);
    expect(
      useIssueLinksStore
        .getState()
        .addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'relates_to' }, ACTOR).ok,
    ).toBe(true);
    expect(useIssueLinksStore.getState().links).toHaveLength(2);
  });

  it('rejects a length-3 blocks cycle and surfaces the cycle path', () => {
    const store = useIssueLinksStore.getState();
    expect(
      store.addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR).ok,
    ).toBe(true);
    expect(
      useIssueLinksStore
        .getState()
        .addLink({ fromIssueId: 'iss_b', toIssueId: 'iss_c', type: 'blocks' }, ACTOR).ok,
    ).toBe(true);

    const result = useIssueLinksStore
      .getState()
      .addLink({ fromIssueId: 'iss_c', toIssueId: 'iss_a', type: 'blocks' }, ACTOR);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('short_blocks_cycle');
      expect(result.cycle).toEqual(['iss_c', 'iss_a', 'iss_b', 'iss_c']);
    }
    expect(useIssueLinksStore.getState().links).toHaveLength(2);
  });

  it('rejects a cycle introduced through is_blocked_by as well', () => {
    const store = useIssueLinksStore.getState();
    // A blocks B
    expect(
      store.addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR).ok,
    ).toBe(true);
    // Adding "A is_blocked_by B" creates the same forbidden mutual block.
    const result = useIssueLinksStore
      .getState()
      .addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'is_blocked_by' }, ACTOR);
    // duplicate_pair fires first because B→A blocks already exists logically?
    // Not in this case — `blocks A→B` and `is_blocked_by A→B` are distinct
    // logical links (A→B blocks vs B→A blocks). The cycle guard kicks in.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('short_blocks_cycle');
    }
  });

  describe('getLinksForIssue', () => {
    it('flips inbound rows so callers always read "this → other"', () => {
      const store = useIssueLinksStore.getState();
      // A blocks B → from B's perspective, the link reads "B is_blocked_by A".
      store.addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR);

      const fromB = useIssueLinksStore.getState().getLinksForIssue('iss_b');
      expect(fromB).toHaveLength(1);
      expect(fromB[0]).toMatchObject({
        type: 'is_blocked_by',
        fromIssueId: 'iss_b',
        toIssueId: 'iss_a',
      });
    });

    it('preserves the canonical row id when flipping', () => {
      const store = useIssueLinksStore.getState();
      const result = store.addLink(
        { fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' },
        ACTOR,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const fromB = useIssueLinksStore.getState().getLinksForIssue('iss_b');
      expect(fromB[0].id).toBe(result.link.id);
    });
  });

  describe('hasInboundBlocker', () => {
    it('returns true when an open issue blocks this one', () => {
      useIssueLinksStore
        .getState()
        .addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR);
      expect(useIssueLinksStore.getState().hasInboundBlocker('iss_b')).toBe(true);
    });

    it('returns false when the blocker is done', () => {
      useIssuesStore.setState((s) => ({
        issues: s.issues.map((i) => (i.id === 'iss_a' ? { ...i, status: 'done' } : i)),
      }));
      useIssueLinksStore
        .getState()
        .addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR);
      expect(useIssueLinksStore.getState().hasInboundBlocker('iss_b')).toBe(false);
    });

    it('returns false for outbound blocks (the issue is the blocker)', () => {
      useIssueLinksStore
        .getState()
        .addLink({ fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' }, ACTOR);
      expect(useIssueLinksStore.getState().hasInboundBlocker('iss_a')).toBe(false);
    });

    it('handles is_blocked_by inbound expression', () => {
      // "B is_blocked_by A" stored as fromIssueId=iss_b, toIssueId=iss_a, type=is_blocked_by.
      useIssueLinksStore
        .getState()
        .addLink({ fromIssueId: 'iss_b', toIssueId: 'iss_a', type: 'is_blocked_by' }, ACTOR);
      expect(useIssueLinksStore.getState().hasInboundBlocker('iss_b')).toBe(true);
    });
  });

  describe('removeLink', () => {
    it('removes the link and appends a link-removed activity', () => {
      const store = useIssueLinksStore.getState();
      const added = store.addLink(
        { fromIssueId: 'iss_a', toIssueId: 'iss_b', type: 'blocks' },
        ACTOR,
      );
      expect(added.ok).toBe(true);
      if (!added.ok) return;

      const ok = useIssueLinksStore.getState().removeLink(added.link.id, ACTOR);
      expect(ok).toBe(true);
      expect(useIssueLinksStore.getState().links).toHaveLength(0);

      const activity = useIssuesStore.getState().activity;
      const aRemoved = activity.filter((e) => e.issueId === 'iss_a' && e.kind === 'link-removed');
      const bRemoved = activity.filter((e) => e.issueId === 'iss_b' && e.kind === 'link-removed');
      expect(aRemoved).toHaveLength(1);
      expect(bRemoved).toHaveLength(1);
    });

    it('returns false when the link id does not exist', () => {
      expect(useIssueLinksStore.getState().removeLink('lnk_nope', ACTOR)).toBe(false);
    });
  });
});
