import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IssueFilters } from './issues-store';
import { uid } from './utils';

export interface QuickFilter {
  id: string;
  projectId: string;
  name: string;
  filters: IssueFilters;
  createdById: string;
}

interface QuickFiltersState {
  custom: QuickFilter[];
  save: (input: Omit<QuickFilter, 'id'>) => QuickFilter;
  remove: (id: string) => void;
  forProject: (projectId: string) => QuickFilter[];
}

export const useQuickFiltersStore = create<QuickFiltersState>()(
  persist(
    (set, get) => ({
      custom: [],
      save: (input) => {
        const filter: QuickFilter = { ...input, id: uid('qf') };
        set((s) => ({ custom: [...s.custom, filter] }));
        return filter;
      },
      remove: (id) => set((s) => ({ custom: s.custom.filter((f) => f.id !== id) })),
      forProject: (projectId) => get().custom.filter((f) => f.projectId === projectId),
    }),
    { name: 'jupiter-quick-filters' },
  ),
);

/** Built-in quick filters (not persisted). */
export const BUILTIN_QUICK_FILTERS: Array<{ id: string; name: string; filters: IssueFilters }> = [
  { id: '__all', name: 'All', filters: {} },
  { id: '__me', name: 'Assigned to me', filters: { assigneeId: 'me' } },
  { id: '__unassigned', name: 'Unassigned', filters: { assigneeId: 'unassigned' } },
  { id: '__bugs', name: 'Bugs', filters: { type: 'bug' } },
  { id: '__in_progress', name: 'In progress', filters: { status: 'in-progress' } },
];
