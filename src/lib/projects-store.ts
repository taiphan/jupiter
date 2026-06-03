import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Member } from './types';
import { SEED_MEMBERS, SEED_PROJECTS } from './seed';
import { uid } from './utils';

interface ProjectsState {
  projects: Project[];
  members: Member[];

  /** Add a new project. Returns the created record. */
  createProject: (input: {
    key: string;
    name: string;
    description?: string;
    type?: Project['type'];
    leadId: string;
    memberIds?: string[];
  }) => Project;

  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  /** Bump and return the next issue counter for this project (used to mint keys). */
  nextIssueNumber: (projectId: string) => number;

  getProject: (id: string) => Project | undefined;
  getProjectByKey: (key: string) => Project | undefined;

  /** Reset to seed data (handy from settings page). */
  reseed: () => void;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      members: SEED_MEMBERS,

      createProject: ({ key, name, description, type = 'kanban', leadId, memberIds = [] }) => {
        const project: Project = {
          id: uid('prj'),
          key: key.toUpperCase(),
          name,
          description,
          type,
          leadId,
          memberIds: Array.from(new Set([leadId, ...memberIds])),
          createdAt: new Date().toISOString(),
          issueCounter: 0,
        };
        set((s) => ({ projects: [...s.projects, project] }));
        return project;
      },

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      nextIssueNumber: (projectId) => {
        let n = 0;
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            n = p.issueCounter + 1;
            return { ...p, issueCounter: n };
          }),
        }));
        return n;
      },

      getProject: (id) => get().projects.find((p) => p.id === id),
      getProjectByKey: (key) =>
        get().projects.find((p) => p.key.toUpperCase() === key.toUpperCase()),

      reseed: () => set({ projects: SEED_PROJECTS, members: SEED_MEMBERS }),
    }),
    { name: 'jupiter-projects' },
  ),
);
