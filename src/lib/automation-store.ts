import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AutomationAction, AutomationRule, AutomationTrigger } from './types';
import { uid } from './utils';

interface AutomationState {
  rules: AutomationRule[];

  createRule: (input: {
    projectId: string;
    name: string;
    description?: string;
    trigger: AutomationTrigger;
    actions: AutomationAction[];
    enabled?: boolean;
  }) => AutomationRule;

  updateRule: (id: string, patch: Partial<Omit<AutomationRule, 'id' | 'projectId'>>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string, enabled: boolean) => void;

  getRulesForProject: (projectId: string) => AutomationRule[];
  getRule: (id: string) => AutomationRule | undefined;
}

export const SEED_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'auto_web_1',
    projectId: 'prj_web',
    name: 'Triage new bugs',
    description: 'Tag newly created bugs for triage',
    enabled: true,
    trigger: { type: 'issue_created', issueType: 'bug' },
    actions: [{ type: 'add_label', label: 'triage' }],
    order: 0,
  },
  {
    id: 'auto_web_2',
    projectId: 'prj_web',
    name: 'Done → shipped comment',
    description: 'Leave a comment when an issue is marked done',
    enabled: true,
    trigger: { type: 'status_changed', toStatus: 'done' },
    actions: [{ type: 'add_comment', commentBody: 'Marked done by workflow automation.' }],
    order: 1,
  },
];

export const useAutomationStore = create<AutomationState>()(
  persist(
    (set, get) => ({
      rules: SEED_AUTOMATION_RULES,

      createRule: ({ projectId, name, description, trigger, actions, enabled = true }) => {
        const siblings = get().rules.filter((r) => r.projectId === projectId);
        const rule: AutomationRule = {
          id: uid('auto'),
          projectId,
          name: name.trim(),
          description: description?.trim() || undefined,
          enabled,
          trigger,
          actions,
          order: siblings.length,
        };
        set((s) => ({ rules: [...s.rules, rule] }));
        return rule;
      },

      updateRule: (id, patch) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      deleteRule: (id) =>
        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

      toggleRule: (id, enabled) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, enabled } : r)),
        })),

      getRulesForProject: (projectId) =>
        get()
          .rules.filter((r) => r.projectId === projectId)
          .sort((a, b) => a.order - b.order),

      getRule: (id) => get().rules.find((r) => r.id === id),
    }),
    { name: 'jupiter-automation' },
  ),
);
