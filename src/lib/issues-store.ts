import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Issue,
  Comment,
  ActivityEntry,
  Attachment,
  IssueStatus,
  IssueType,
  Priority,
  ActivityKind,
} from './types';
import { STATUS_LABELS, ISSUE_TYPE_LABELS, PRIORITY_LABELS } from './types';
import { SEED_ISSUES, SEED_COMMENTS, SEED_ACTIVITY } from './seed';
import { uid } from './utils';
import { useProjectsStore } from './projects-store';
import {
  addWatcherIds,
  defaultWatchersForIssue,
  issueNotificationRecipientIds,
  removeWatcherId,
} from './derive/watchers';
import { notifyIssueEventEmail } from './notify-issue-event';
import { runAutomations } from './automation-runner';
import { dispatchWebhooks } from './webhook-dispatcher';

const RANK_STEP = 1000;
/** Max attachment size kept in localStorage (1.5 MB raw → ~2 MB base64). */
export const MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;

export interface IssueFilters {
  projectId?: string;
  status?: IssueStatus | 'all';
  type?: IssueType | 'all';
  priority?: Priority | 'all';
  assigneeId?: string | 'all' | 'unassigned' | 'me';
  search?: string;
  label?: string | 'all';
  fixVersionId?: string | 'all' | 'none';
}

interface IssuesState {
  issues: Issue[];
  comments: Comment[];
  activity: ActivityEntry[];
  attachments: Attachment[];

  createIssue: (input: {
    projectId: string;
    type: IssueType;
    summary: string;
    description?: string;
    status?: IssueStatus;
    priority?: Priority;
    assigneeId?: string;
    reporterId: string;
    parentId?: string;
    labels?: string[];
    storyPoints?: number;
    startDate?: string;
    dueDate?: string;
  }) => Issue;

  updateIssue: (id: string, patch: Partial<Omit<Issue, 'id' | 'key' | 'projectId' | 'createdAt'>>, actorId: string, options?: { skipAutomation?: boolean }) => void;
  deleteIssue: (id: string) => void;

  /** Move an issue between board columns; updates rank to drop at the target position. */
  moveIssue: (params: {
    id: string;
    toStatus: IssueStatus;
    /** Index within the target column (0-based). If omitted, appends to the end. */
    toIndex?: number;
    actorId: string;
  }) => void;

  addComment: (input: { issueId: string; authorId: string; body: string }) => Comment;
  deleteComment: (id: string) => void;

  /** Add an attachment. Returns null if it exceeds the size cap. */
  addAttachment: (input: {
    issueId: string;
    name: string;
    mime: string;
    size: number;
    dataUrl: string;
    uploadedById: string;
  }) => Attachment | null;
  deleteAttachment: (id: string) => void;
  getAttachmentsForIssue: (issueId: string) => Attachment[];

  getIssue: (id: string) => Issue | undefined;
  getIssueByKey: (key: string) => Issue | undefined;
  getIssuesByProject: (projectId: string) => Issue[];
  /** Issues in a single board column, sorted by rank. */
  getIssuesInColumn: (projectId: string, status: IssueStatus) => Issue[];
  getCommentsForIssue: (issueId: string) => Comment[];
  getActivityForIssue: (issueId: string) => ActivityEntry[];

  toggleWatch: (issueId: string, userId: string) => void;
  addWatcher: (issueId: string, watcherId: string, actorId: string) => void;
  removeWatcher: (issueId: string, watcherId: string, actorId: string) => void;

  reseed: () => void;
}

function nowIso() {
  return new Date().toISOString();
}

function queueIssueEmail(issue: Issue, actorId: string, message: string): void {
  const recipientUserIds = issueNotificationRecipientIds(issue, actorId);
  if (recipientUserIds.length === 0) return;
  void notifyIssueEventEmail({
    issueKey: issue.key,
    summary: issue.summary,
    message,
    recipientUserIds,
  });
}

const EMAIL_NOTIFY_KINDS = new Set<ActivityKind>(['status', 'assignee', 'priority', 'comment']);

function maybeEmailForNewActivity(
  beforeLen: number,
  activity: ActivityEntry[],
  issue: Issue,
  actorId: string,
): void {
  if (activity.length <= beforeLen) return;
  const entry = activity[activity.length - 1];
  if (!EMAIL_NOTIFY_KINDS.has(entry.kind)) return;
  queueIssueEmail(issue, actorId, entry.message);
}

function pushActivity(
  list: ActivityEntry[],
  issueId: string,
  actorId: string,
  kind: ActivityKind,
  message: string,
): ActivityEntry[] {
  return [
    ...list,
    {
      id: uid('act'),
      issueId,
      actorId,
      kind,
      message,
      createdAt: nowIso(),
    },
  ];
}

export const useIssuesStore = create<IssuesState>()(
  persist(
    (set, get) => ({
      issues: SEED_ISSUES,
      comments: SEED_COMMENTS,
      activity: SEED_ACTIVITY,
      attachments: [],

      createIssue: ({
        projectId, type, summary, description,
        status = 'todo', priority = 'medium',
        assigneeId, reporterId, parentId, labels = [], storyPoints, startDate, dueDate,
      }) => {
        // Mint the next key from the projects store
        const project = useProjectsStore.getState().getProject(projectId);
        if (!project) throw new Error('Project not found');
        const number = useProjectsStore.getState().nextIssueNumber(projectId);
        const key = `${project.key}-${number}`;

        // Place at the end of its column
        const lastRank = get()
          .issues.filter((i) => i.projectId === projectId && i.status === status)
          .reduce((max, i) => Math.max(max, i.rank), 0);

        const issue: Issue = {
          id: uid('iss'),
          key,
          projectId,
          type,
          summary,
          description,
          status,
          priority,
          assigneeId,
          reporterId,
          parentId,
          labels,
          storyPoints,
          startDate,
          dueDate,
          fixVersionIds: [],
          rank: lastRank + RANK_STEP,
          watcherIds: defaultWatchersForIssue(reporterId, assigneeId),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        set((s) => ({
          issues: [...s.issues, issue],
          activity: pushActivity(s.activity, issue.id, reporterId, 'created', 'Created this issue'),
        }));

        runAutomations({ event: 'issue_created', issue, actorId: reporterId });
        dispatchWebhooks({ event: 'issue_created', issue, actorId: reporterId });

        return get().issues.find((i) => i.id === issue.id) ?? issue;
      },

      updateIssue: (id, patch, actorId, options) => {
        let before: Issue | undefined;
        let after: Issue | undefined;
        let statusChanged = false;

        set((s) => {
          before = s.issues.find((i) => i.id === id);
          if (!before) return s;

          statusChanged = Boolean(patch.status && patch.status !== before.status);

          const beforeWatchers = before.watcherIds ?? [];

          after = {
            ...before,
            ...patch,
            watcherIds: patch.watcherIds ?? beforeWatchers,
            updatedAt: nowIso(),
          };

          if ('assigneeId' in patch && patch.assigneeId && patch.assigneeId !== before.assigneeId) {
            after.watcherIds = addWatcherIds(after.watcherIds, patch.assigneeId);
          }

          let activity = s.activity;

          if (patch.status && patch.status !== before.status) {
            activity = pushActivity(activity, id, actorId, 'status',
              `Status: ${STATUS_LABELS[before.status]} → ${STATUS_LABELS[patch.status]}`);
          }
          if (patch.priority && patch.priority !== before.priority) {
            activity = pushActivity(activity, id, actorId, 'priority',
              `Priority: ${PRIORITY_LABELS[before.priority]} → ${PRIORITY_LABELS[patch.priority]}`);
          }
          if (patch.type && patch.type !== before.type) {
            activity = pushActivity(activity, id, actorId, 'type',
              `Type: ${ISSUE_TYPE_LABELS[before.type]} → ${ISSUE_TYPE_LABELS[patch.type]}`);
          }
          if ('assigneeId' in patch && patch.assigneeId !== before.assigneeId) {
            activity = pushActivity(activity, id, actorId, 'assignee',
              `Assignee changed`);
          }
          if (patch.summary && patch.summary !== before.summary) {
            activity = pushActivity(activity, id, actorId, 'summary', 'Updated the summary');
          }
          if ('description' in patch && patch.description !== before.description) {
            activity = pushActivity(activity, id, actorId, 'description', 'Updated the description');
          }
          if (patch.labels && JSON.stringify(patch.labels) !== JSON.stringify(before.labels)) {
            activity = pushActivity(activity, id, actorId, 'label', 'Updated labels');
          }
          if (patch.customFields && JSON.stringify(patch.customFields) !== JSON.stringify(before.customFields)) {
            activity = pushActivity(activity, id, actorId, 'label', 'Updated fields');
          }
          if ('startDate' in patch && patch.startDate !== before.startDate) {
            activity = pushActivity(activity, id, actorId, 'label',
              patch.startDate ? `Start date set to ${patch.startDate}` : 'Start date cleared');
          }
          if ('dueDate' in patch && patch.dueDate !== before.dueDate) {
            activity = pushActivity(activity, id, actorId, 'label',
              patch.dueDate ? `Due date set to ${patch.dueDate}` : 'Due date cleared');
          }
          if (
            patch.fixVersionIds &&
            JSON.stringify(patch.fixVersionIds) !== JSON.stringify(before.fixVersionIds ?? [])
          ) {
            activity = pushActivity(activity, id, actorId, 'label', 'Fix versions updated');
          }
          if (
            patch.watcherIds &&
            JSON.stringify(patch.watcherIds) !== JSON.stringify(beforeWatchers)
          ) {
            activity = pushActivity(activity, id, actorId, 'watcher', 'Watchers updated');
          }

          maybeEmailForNewActivity(s.activity.length, activity, after, actorId);

          return {
            issues: s.issues.map((i) => (i.id === id ? after! : i)),
            activity,
          };
        });

        if (before && after) {
          const prev = before;
          if (!options?.skipAutomation) {
            if (statusChanged) {
              runAutomations({
                event: 'status_changed',
                issue: after,
                before: prev,
                actorId,
              });
            }
            const assigneeChanged =
              'assigneeId' in patch && patch.assigneeId !== prev.assigneeId;
            if (assigneeChanged) {
              runAutomations({
                event: 'assignee_changed',
                issue: after,
                before: prev,
                actorId,
              });
            }
            const priorityChanged =
              Boolean(patch.priority && patch.priority !== prev.priority);
            if (priorityChanged) {
              runAutomations({
                event: 'priority_changed',
                issue: after,
                before: prev,
                actorId,
              });
            }
            const addedLabels = patch.labels
              ? patch.labels.filter((l) => !prev.labels.includes(l))
              : [];
            if (addedLabels.length > 0) {
              runAutomations({
                event: 'label_added',
                issue: after,
                before: prev,
                actorId,
                addedLabels,
              });
            }
          }
          if (statusChanged) {
            dispatchWebhooks({
              event: 'issue_status_changed',
              issue: after,
              before,
              actorId,
            });
          }
          dispatchWebhooks({ event: 'issue_updated', issue: after, actorId });
        }
      },

      deleteIssue: (id) =>
        set((s) => ({
          issues: s.issues.filter((i) => i.id !== id),
          comments: s.comments.filter((c) => c.issueId !== id),
          activity: s.activity.filter((a) => a.issueId !== id),
          attachments: s.attachments.filter((a) => a.issueId !== id),
        })),

      moveIssue: ({ id, toStatus, toIndex, actorId }) => {
        let previous: Issue | undefined;
        let moved: Issue | undefined;

        set((s) => {
          const issue = s.issues.find((i) => i.id === id);
          if (!issue) return s;
          previous = issue;

          const columnSiblings = s.issues
            .filter((i) => i.projectId === issue.projectId && i.status === toStatus && i.id !== id)
            .sort((a, b) => a.rank - b.rank);

          const insertAt = Math.max(0, Math.min(toIndex ?? columnSiblings.length, columnSiblings.length));
          const rankBefore = columnSiblings[insertAt - 1];
          const rankAfter = columnSiblings[insertAt];

          let newRank: number;
          if (!rankBefore && !rankAfter) newRank = RANK_STEP;
          else if (!rankBefore && rankAfter) newRank = rankAfter.rank - RANK_STEP;
          else if (rankBefore && !rankAfter) newRank = rankBefore.rank + RANK_STEP;
          else newRank = (rankBefore!.rank + rankAfter!.rank) / 2;

          moved = {
            ...issue,
            status: toStatus,
            rank: newRank,
            updatedAt: nowIso(),
          };

          let activity = s.activity;
          if (issue.status !== toStatus) {
            activity = pushActivity(activity, id, actorId, 'status',
              `Status: ${STATUS_LABELS[issue.status]} → ${STATUS_LABELS[toStatus]}`);
          }

          maybeEmailForNewActivity(s.activity.length, activity, moved, actorId);

          return {
            issues: s.issues.map((i) => (i.id === id ? moved! : i)),
            activity,
          };
        });

        if (previous && moved && previous.status !== toStatus) {
          runAutomations({
            event: 'status_changed',
            issue: moved,
            before: previous,
            actorId,
          });
          dispatchWebhooks({
            event: 'issue_status_changed',
            issue: moved,
            before: previous,
            actorId,
          });
          dispatchWebhooks({ event: 'issue_updated', issue: moved, actorId });
        }
      },

      addComment: ({ issueId, authorId, body }) => {
        const comment: Comment = {
          id: uid('cmt'),
          issueId,
          authorId,
          body,
          createdAt: nowIso(),
        };
        set((s) => ({
          comments: [...s.comments, comment],
          activity: pushActivity(s.activity, issueId, authorId, 'comment', 'Added a comment'),
        }));
        const issue = get().issues.find((i) => i.id === issueId);
        if (issue) queueIssueEmail(issue, authorId, 'Added a comment');
        return comment;
      },

      deleteComment: (id) =>
        set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),

      addAttachment: ({ issueId, name, mime, size, dataUrl, uploadedById }) => {
        if (size > MAX_ATTACHMENT_BYTES) return null;
        const attachment: Attachment = {
          id: uid('att'),
          issueId,
          name,
          mime,
          size,
          dataUrl,
          uploadedById,
          createdAt: nowIso(),
        };
        set((s) => ({ attachments: [...s.attachments, attachment] }));
        return attachment;
      },

      deleteAttachment: (id) =>
        set((s) => ({ attachments: s.attachments.filter((a) => a.id !== id) })),

      getAttachmentsForIssue: (issueId) =>
        get()
          .attachments.filter((a) => a.issueId === issueId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),

      getIssue: (id) => get().issues.find((i) => i.id === id),
      getIssueByKey: (key) =>
        get().issues.find((i) => i.key.toUpperCase() === key.toUpperCase()),

      getIssuesByProject: (projectId) =>
        get().issues.filter((i) => i.projectId === projectId),

      getIssuesInColumn: (projectId, status) =>
        get()
          .issues.filter((i) => i.projectId === projectId && i.status === status)
          .sort((a, b) => a.rank - b.rank),

      getCommentsForIssue: (issueId) =>
        get()
          .comments.filter((c) => c.issueId === issueId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),

      getActivityForIssue: (issueId) =>
        get()
          .activity.filter((a) => a.issueId === issueId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),

      toggleWatch: (issueId, userId) => {
        const issue = get().issues.find((i) => i.id === issueId);
        if (!issue) return;
        const next = issue.watcherIds.includes(userId)
          ? removeWatcherId(issue.watcherIds, userId)
          : addWatcherIds(issue.watcherIds, userId);
        get().updateIssue(issueId, { watcherIds: next }, userId);
      },

      addWatcher: (issueId, watcherId, actorId) => {
        const issue = get().issues.find((i) => i.id === issueId);
        if (!issue || issue.watcherIds.includes(watcherId)) return;
        get().updateIssue(
          issueId,
          { watcherIds: addWatcherIds(issue.watcherIds, watcherId) },
          actorId,
        );
      },

      removeWatcher: (issueId, watcherId, actorId) => {
        const issue = get().issues.find((i) => i.id === issueId);
        if (!issue || !issue.watcherIds.includes(watcherId)) return;
        get().updateIssue(
          issueId,
          { watcherIds: removeWatcherId(issue.watcherIds, watcherId) },
          actorId,
        );
      },

      reseed: () => set({ issues: SEED_ISSUES, comments: SEED_COMMENTS, activity: SEED_ACTIVITY, attachments: [] }),
    }),
    {
      name: 'jupiter-issues',
      merge: (persisted, current) => {
        const p = persisted as Partial<IssuesState> | undefined;
        if (!p?.issues) return current as IssuesState;
        return {
          ...(current as IssuesState),
          ...p,
          issues: p.issues.map((i) => ({
            ...i,
            fixVersionIds: i.fixVersionIds ?? [],
            watcherIds:
              i.watcherIds ??
              defaultWatchersForIssue(i.reporterId, i.assigneeId),
          })),
        };
      },
    },
  ),
);

/** Selector helper: filter issues across the workspace. */
export function applyFilters(
  issues: Issue[],
  filters: IssueFilters,
  currentUserId?: string,
): Issue[] {
  return issues.filter((i) => {
    if (filters.projectId && i.projectId !== filters.projectId) return false;
    if (filters.status && filters.status !== 'all' && i.status !== filters.status) return false;
    if (filters.type && filters.type !== 'all' && i.type !== filters.type) return false;
    if (filters.priority && filters.priority !== 'all' && i.priority !== filters.priority) return false;

    if (filters.assigneeId && filters.assigneeId !== 'all') {
      if (filters.assigneeId === 'unassigned' && i.assigneeId) return false;
      else if (filters.assigneeId === 'me' && i.assigneeId !== currentUserId) return false;
      else if (
        filters.assigneeId !== 'unassigned' &&
        filters.assigneeId !== 'me' &&
        i.assigneeId !== filters.assigneeId
      ) return false;
    }

    if (filters.label && filters.label !== 'all' && !i.labels.includes(filters.label)) return false;

    if (filters.fixVersionId && filters.fixVersionId !== 'all') {
      const ids = i.fixVersionIds ?? [];
      if (filters.fixVersionId === 'none' && ids.length > 0) return false;
      if (filters.fixVersionId !== 'none' && !ids.includes(filters.fixVersionId)) return false;
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!i.summary.toLowerCase().includes(q) && !i.key.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
