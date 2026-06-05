import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectVersion } from './types';
import { uid } from './utils';
import { useIssuesStore } from '@/lib/issues-store';

interface VersionsState {
  versions: ProjectVersion[];

  createVersion: (input: {
    projectId: string;
    name: string;
    description?: string;
    releaseDate?: string;
    released?: boolean;
  }) => ProjectVersion;

  updateVersion: (id: string, patch: Partial<Omit<ProjectVersion, 'id' | 'projectId'>>) => void;
  deleteVersion: (id: string) => void;
  markReleased: (id: string, releaseDate?: string) => void;

  getVersionsForProject: (projectId: string) => ProjectVersion[];
  getVersion: (id: string) => ProjectVersion | undefined;
}

export const SEED_VERSIONS: ProjectVersion[] = [
  {
    id: 'ver_web_1',
    projectId: 'prj_web',
    name: '1.0.0',
    description: 'Initial public launch',
    releaseDate: '2026-05-01',
    released: true,
    order: 0,
  },
  {
    id: 'ver_web_2',
    projectId: 'prj_web',
    name: '1.1.0',
    description: 'Dashboard and timeline',
    releaseDate: '2026-06-15',
    released: false,
    order: 1,
  },
  {
    id: 'ver_mob_1',
    projectId: 'prj_mobile',
    name: '2.0.0',
    released: false,
    order: 0,
  },
];

export const useVersionsStore = create<VersionsState>()(
  persist(
    (set, get) => ({
      versions: SEED_VERSIONS,

      createVersion: ({ projectId, name, description, releaseDate, released = false }) => {
        const siblings = get().versions.filter((v) => v.projectId === projectId);
        const version: ProjectVersion = {
          id: uid('ver'),
          projectId,
          name: name.trim(),
          description: description?.trim() || undefined,
          releaseDate,
          released,
          order: siblings.length,
        };
        set((s) => ({ versions: [...s.versions, version] }));
        return version;
      },

      updateVersion: (id, patch) =>
        set((s) => ({
          versions: s.versions.map((v) => (v.id === id ? { ...v, ...patch } : v)),
        })),

      deleteVersion: (id) => {
        set((s) => ({ versions: s.versions.filter((v) => v.id !== id) }));
        useIssuesStore.setState((s) => ({
          issues: s.issues.map((i) =>
            (i.fixVersionIds ?? []).includes(id)
              ? { ...i, fixVersionIds: (i.fixVersionIds ?? []).filter((vid) => vid !== id) }
              : i,
          ),
        }));
      },

      markReleased: (id, releaseDate) =>
        set((s) => ({
          versions: s.versions.map((v) =>
            v.id === id
              ? {
                  ...v,
                  released: true,
                  releaseDate: releaseDate ?? v.releaseDate ?? new Date().toISOString().slice(0, 10),
                }
              : v,
          ),
        })),

      getVersionsForProject: (projectId) =>
        get()
          .versions.filter((v) => v.projectId === projectId)
          .sort((a, b) => a.order - b.order),

      getVersion: (id) => get().versions.find((v) => v.id === id),
    }),
    { name: 'jupiter-versions' },
  ),
);
