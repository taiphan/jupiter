import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Sprint, SprintState } from './types';
import { SEED_SPRINTS } from './seed';
import { uid } from './utils';
import { useIssuesStore } from './issues-store';

interface SprintsState {
  sprints: Sprint[];

  /** Snapshot of completed-at totals by date for burndown reporting. */
  burndownSnapshots: Record<string, { date: string; remaining: number }[]>;

  createSprint: (input: {
    projectId: string;
    name?: string;
    goal?: string;
  }) => Sprint;

  updateSprint: (id: string, patch: Partial<Sprint>) => void;
  deleteSprint: (id: string) => void;

  /** Move a planned sprint to active. Only one active sprint per project. */
  startSprint: (id: string, range?: { startDate?: string; endDate?: string }) => void;

  /** Mark active sprint as completed and move incomplete issues back to backlog (or to next sprint). */
  completeSprint: (id: string, options?: { moveIncompleteToSprintId?: string }) => void;

  /** Add or remove issues from a sprint. */
  addIssueToSprint: (issueId: string, sprintId: string) => void;
  removeIssueFromSprint: (issueId: string) => void;

  getSprintById: (id: string) => Sprint | undefined;
  getActiveSprint: (projectId: string) => Sprint | undefined;
  getSprintsByProject: (projectId: string) => Sprint[];

  reseed: () => void;
}

const nowIso = () => new Date().toISOString();

export const useSprintsStore = create<SprintsState>()(
  persist(
    (set, get) => ({
      sprints: SEED_SPRINTS,
      burndownSnapshots: {},

      createSprint: ({ projectId, name, goal }) => {
        const projectSprints = get().sprints.filter((s) => s.projectId === projectId);
        const number = projectSprints.length + 1;
        const sprint: Sprint = {
          id: uid('spr'),
          projectId,
          number,
          name: name?.trim() || `Sprint ${number}`,
          goal: goal?.trim() || undefined,
          state: 'planned',
        };
        set((s) => ({ sprints: [...s.sprints, sprint] }));
        return sprint;
      },

      updateSprint: (id, patch) =>
        set((s) => ({
          sprints: s.sprints.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)),
        })),

      deleteSprint: (id) => {
        // Remove sprint reference from any issues so they fall back to the backlog
        const issuesStore = useIssuesStore.getState();
        for (const issue of issuesStore.issues) {
          if (issue.sprintId === id) {
            issuesStore.updateIssue(issue.id, { sprintId: undefined }, '__system');
          }
        }
        set((s) => ({ sprints: s.sprints.filter((sp) => sp.id !== id) }));
      },

      startSprint: (id, range) => {
        const sprint = get().sprints.find((s) => s.id === id);
        if (!sprint) return;
        // Demote any other active sprint in the same project (one active at a time)
        set((s) => ({
          sprints: s.sprints.map((sp) => {
            if (sp.id === id) {
              return {
                ...sp,
                state: 'active' as SprintState,
                startDate: range?.startDate ?? nowIso(),
                endDate: range?.endDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              };
            }
            if (sp.projectId === sprint.projectId && sp.state === 'active') {
              return { ...sp, state: 'planned' as SprintState };
            }
            return sp;
          }),
        }));
      },

      completeSprint: (id, options = {}) => {
        const sprint = get().sprints.find((s) => s.id === id);
        if (!sprint) return;
        const issuesStore = useIssuesStore.getState();
        // Move incomplete issues out of the completing sprint
        const sprintIssues = issuesStore.issues.filter((i) => i.sprintId === id);
        const completed = sprintIssues.filter((i) => i.status === 'done');
        const incomplete = sprintIssues.filter((i) => i.status !== 'done');

        for (const issue of incomplete) {
          issuesStore.updateIssue(
            issue.id,
            { sprintId: options.moveIncompleteToSprintId },
            '__system',
          );
        }

        // Snapshot burndown points (story points remaining over time) — simple end snapshot
        const remaining = incomplete.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
        set((s) => ({
          sprints: s.sprints.map((sp) =>
            sp.id === id
              ? { ...sp, state: 'completed' as SprintState, completedAt: nowIso() }
              : sp,
          ),
          burndownSnapshots: {
            ...s.burndownSnapshots,
            [id]: [
              ...(s.burndownSnapshots[id] ?? []),
              { date: nowIso(), remaining },
            ],
          },
        }));

        // Pin the completed-count for velocity reporting (no separate field needed)
        return { completed: completed.length, incomplete: incomplete.length };
      },

      addIssueToSprint: (issueId, sprintId) => {
        const issuesStore = useIssuesStore.getState();
        issuesStore.updateIssue(issueId, { sprintId }, '__system');
      },

      removeIssueFromSprint: (issueId) => {
        const issuesStore = useIssuesStore.getState();
        issuesStore.updateIssue(issueId, { sprintId: undefined }, '__system');
      },

      getSprintById: (id) => get().sprints.find((s) => s.id === id),
      getActiveSprint: (projectId) =>
        get().sprints.find((s) => s.projectId === projectId && s.state === 'active'),
      getSprintsByProject: (projectId) =>
        get().sprints
          .filter((s) => s.projectId === projectId)
          .sort((a, b) => a.number - b.number),

      reseed: () => set({ sprints: SEED_SPRINTS, burndownSnapshots: {} }),
    }),
    { name: 'jupiter-sprints' },
  ),
);
