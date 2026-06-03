import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivityEntry, IssueLink, IssueLinkType } from './types';
import { ISSUE_LINK_TYPE_LABELS } from './types';
import { uid } from './utils';
import { useIssuesStore } from './issues-store';
import { findShortBlocksCycle } from './derive/link-cycle';

/**
 * Issue links runtime store (Jupiter v1.1).
 *
 * Validates Requirements 4.1, 4.2, 4.3, 4.4.
 *
 * Per the v1.1 architectural deviation noted in `tasks.md`, runtime data
 * lives in Zustand persisted to `localStorage`; the matching Drizzle table
 * (`issue_links` in `schema.ts`) is reserved for the v1.2 server migration.
 *
 * Each link is persisted as a single canonical row. Paired link types
 * (`blocks` ↔ `is_blocked_by`, `clones` ↔ `is_cloned_by`,
 * `duplicates` ↔ `is_duplicated_by`) are not duplicated — the inverse view
 * is derived on read by `getLinksForIssue`. `relates_to` is symmetric and
 * also stored as a single row.
 *
 * Mutations append to the v1.0 activity log on the issues store so the
 * audit page surfaces every link add / remove.
 */

/** Discriminated result returned by mutating actions. */
export type LinkResult =
  | { ok: true; link: IssueLink }
  | { ok: false; reason: LinkRejectionReason; cycle?: string[] };

export type LinkRejectionReason =
  | 'self_link'
  | 'unknown_issue'
  | 'duplicate_pair'
  | 'short_blocks_cycle'
  | 'not_found';

/** Inverse mapping for paired link types; `relates_to` is symmetric. */
const INVERSE_TYPE: Record<IssueLinkType, IssueLinkType> = {
  blocks: 'is_blocked_by',
  is_blocked_by: 'blocks',
  relates_to: 'relates_to',
  clones: 'is_cloned_by',
  is_cloned_by: 'clones',
  duplicates: 'is_duplicated_by',
  is_duplicated_by: 'duplicates',
};

/** Test whether two link rows (or a row + a candidate) describe the same pair. */
function samePair(a: { fromIssueId: string; toIssueId: string; type: IssueLinkType }, b: { fromIssueId: string; toIssueId: string; type: IssueLinkType }) {
  if (a.type === b.type && a.fromIssueId === b.fromIssueId && a.toIssueId === b.toIssueId) return true;
  // Inverse direction: same logical link expressed from the opposite side.
  if (
    INVERSE_TYPE[a.type] === b.type &&
    a.fromIssueId === b.toIssueId &&
    a.toIssueId === b.fromIssueId
  ) return true;
  return false;
}

interface IssueLinksState {
  links: IssueLink[];

  /**
   * Add a link between two issues, enforcing self-link rejection (Req 4.4),
   * duplicate-pair rejection (Req 4.4), and short-cycle rejection on the
   * `blocks` graph (Req 4.4 + Property 4).
   *
   * Always returns a result; never throws.
   */
  addLink: (
    input: { fromIssueId: string; toIssueId: string; type: IssueLinkType },
    actorId: string,
  ) => LinkResult;

  /**
   * Remove a link by id. Returns `false` if the id was not found.
   */
  removeLink: (linkId: string, actorId: string) => boolean;

  /**
   * Read view that returns every link involving `issueId` from the issue's
   * own perspective: outbound rows (where the issue sits on the `from`
   * side) are returned as-is, and inbound rows are flipped so that the
   * caller always reads the link as "this issue → other issue" with the
   * inverse type. The returned objects keep the canonical row id so that
   * removal still targets the persisted record.
   */
  getLinksForIssue: (issueId: string) => IssueLink[];

  /**
   * Cheap check used by board cards: does this issue have at least one
   * inbound `blocks` edge from an issue that is not in `done`? Used to
   * render the "Blocked" badge per Req 4.5.
   */
  hasInboundBlocker: (issueId: string) => boolean;

  /** Reset for tests. */
  reset: () => void;
}

const nowIso = () => new Date().toISOString();

function pushActivity(
  issueId: string,
  actorId: string,
  kind: 'link-added' | 'link-removed',
  message: string,
) {
  const entry: ActivityEntry = {
    id: uid('act'),
    issueId,
    actorId,
    kind,
    message,
    createdAt: nowIso(),
  };
  useIssuesStore.setState((s) => ({ activity: [...s.activity, entry] }));
}

export const useIssueLinksStore = create<IssueLinksState>()(
  persist(
    (set, get) => ({
      links: [],

      addLink: ({ fromIssueId, toIssueId, type }, actorId) => {
        // 1) Self-link rejection (Req 4.4).
        if (fromIssueId === toIssueId) {
          return { ok: false, reason: 'self_link' };
        }

        // 2) Both endpoints must reference an existing issue.
        const issuesStore = useIssuesStore.getState();
        const fromIssue = issuesStore.getIssue(fromIssueId);
        const toIssue = issuesStore.getIssue(toIssueId);
        if (!fromIssue || !toIssue) {
          return { ok: false, reason: 'unknown_issue' };
        }

        const existing = get().links;

        // 3) Duplicate-pair rejection (Req 4.4): same logical link in either
        // direction is forbidden, regardless of which side the user added it
        // from. Different link types between the same pair are allowed.
        for (const link of existing) {
          if (samePair(link, { fromIssueId, toIssueId, type })) {
            return { ok: false, reason: 'duplicate_pair' };
          }
        }

        // 4) Short-cycle rejection on the `blocks` graph (Req 4.4).
        // A new `blocks` edge from F → T creates a cycle if T can already
        // reach F in ≤ 2 hops. A new `is_blocked_by` edge expresses the
        // inverse direction, so check the same constraint with sides swapped.
        if (type === 'blocks' || type === 'is_blocked_by') {
          const blocksPair =
            type === 'blocks'
              ? { from: fromIssueId, to: toIssueId }
              : { from: toIssueId, to: fromIssueId };
          const cycle = findShortBlocksCycle(blocksPair, existing, 3);
          if (cycle) {
            return { ok: false, reason: 'short_blocks_cycle', cycle };
          }
        }

        const link: IssueLink = {
          id: uid('lnk'),
          type,
          fromIssueId,
          toIssueId,
          createdAt: nowIso(),
          createdBy: actorId,
        };
        set((s) => ({ links: [...s.links, link] }));

        // Audit: append to the activity log on both sides so each issue's
        // detail panel shows the link in its history.
        const fromKey = fromIssue.key;
        const toKey = toIssue.key;
        const label = ISSUE_LINK_TYPE_LABELS[type];
        const inverseLabel = ISSUE_LINK_TYPE_LABELS[INVERSE_TYPE[type]];
        pushActivity(fromIssueId, actorId, 'link-added', `Linked ${label.toLowerCase()} ${toKey}`);
        if (toIssueId !== fromIssueId) {
          pushActivity(toIssueId, actorId, 'link-added', `Linked ${inverseLabel.toLowerCase()} ${fromKey}`);
        }

        return { ok: true, link };
      },

      removeLink: (linkId, actorId) => {
        const link = get().links.find((l) => l.id === linkId);
        if (!link) return false;
        set((s) => ({ links: s.links.filter((l) => l.id !== linkId) }));

        // Audit on both sides, mirroring addLink.
        const issuesStore = useIssuesStore.getState();
        const fromIssue = issuesStore.getIssue(link.fromIssueId);
        const toIssue = issuesStore.getIssue(link.toIssueId);
        const label = ISSUE_LINK_TYPE_LABELS[link.type];
        const inverseLabel = ISSUE_LINK_TYPE_LABELS[INVERSE_TYPE[link.type]];
        if (fromIssue && toIssue) {
          pushActivity(
            link.fromIssueId,
            actorId,
            'link-removed',
            `Removed ${label.toLowerCase()} ${toIssue.key}`,
          );
          if (link.fromIssueId !== link.toIssueId) {
            pushActivity(
              link.toIssueId,
              actorId,
              'link-removed',
              `Removed ${inverseLabel.toLowerCase()} ${fromIssue.key}`,
            );
          }
        }
        return true;
      },

      getLinksForIssue: (issueId) => {
        const all = get().links;
        const fromThisIssue = all.filter((l) => l.fromIssueId === issueId);
        const toThisIssue = all.filter((l) => l.toIssueId === issueId && l.fromIssueId !== issueId);
        // Flip the inbound rows so callers always read "this → other".
        const inverted: IssueLink[] = toThisIssue.map((l) => ({
          ...l,
          type: INVERSE_TYPE[l.type],
          fromIssueId: l.toIssueId,
          toIssueId: l.fromIssueId,
        }));
        return [...fromThisIssue, ...inverted].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        );
      },

      hasInboundBlocker: (issueId) => {
        const issuesStore = useIssuesStore.getState();
        for (const link of get().links) {
          // Inbound `blocks` edge: "blocker → this".
          if (link.type === 'blocks' && link.toIssueId === issueId) {
            const blocker = issuesStore.getIssue(link.fromIssueId);
            if (blocker && blocker.status !== 'done') return true;
          }
          // Equivalent inbound: "this is_blocked_by blocker" stored with this
          // issue on the `from` side and the blocker on the `to` side.
          if (link.type === 'is_blocked_by' && link.fromIssueId === issueId) {
            const blocker = issuesStore.getIssue(link.toIssueId);
            if (blocker && blocker.status !== 'done') return true;
          }
        }
        return false;
      },

      reset: () => set({ links: [] }),
    }),
    { name: 'jupiter-issue-links' },
  ),
);
