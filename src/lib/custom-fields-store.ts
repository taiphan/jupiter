import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomFieldDef, CustomFieldType } from './types';
import { uid } from './utils';

interface CustomFieldsState {
  fields: CustomFieldDef[];

  createField: (input: {
    projectId: string;
    name: string;
    type: CustomFieldType;
    options?: string[];
    required?: boolean;
  }) => CustomFieldDef;

  updateField: (id: string, patch: Partial<Omit<CustomFieldDef, 'id' | 'projectId'>>) => void;
  deleteField: (id: string) => void;
  reorderField: (id: string, direction: -1 | 1) => void;

  getFieldsForProject: (projectId: string) => CustomFieldDef[];
}

const SEED_FIELDS: CustomFieldDef[] = [
  {
    id: 'cf_web_env', projectId: 'prj_web', name: 'Environment', type: 'select',
    options: ['Production', 'Staging', 'Local'], order: 0,
  },
  {
    id: 'cf_web_url', projectId: 'prj_web', name: 'Design link', type: 'url', order: 1,
  },
  {
    id: 'cf_mob_device', projectId: 'prj_mobile', name: 'Device', type: 'select',
    options: ['iOS', 'Android', 'Both'], order: 0,
  },
  {
    id: 'cf_plat_oncall', projectId: 'prj_platform', name: 'Needs on-call', type: 'checkbox', order: 0,
  },
];

export const useCustomFieldsStore = create<CustomFieldsState>()(
  persist(
    (set, get) => ({
      fields: SEED_FIELDS,

      createField: ({ projectId, name, type, options, required }) => {
        const projectFields = get().fields.filter((f) => f.projectId === projectId);
        const field: CustomFieldDef = {
          id: uid('cf'),
          projectId,
          name: name.trim(),
          type,
          options: type === 'select' ? (options ?? []) : undefined,
          required,
          order: projectFields.length,
        };
        set((s) => ({ fields: [...s.fields, field] }));
        return field;
      },

      updateField: (id, patch) =>
        set((s) => ({
          fields: s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),

      deleteField: (id) =>
        set((s) => ({ fields: s.fields.filter((f) => f.id !== id) })),

      reorderField: (id, direction) =>
        set((s) => {
          const field = s.fields.find((f) => f.id === id);
          if (!field) return s;
          const siblings = s.fields
            .filter((f) => f.projectId === field.projectId)
            .sort((a, b) => a.order - b.order);
          const idx = siblings.findIndex((f) => f.id === id);
          const target = idx + direction;
          if (target < 0 || target >= siblings.length) return s;
          [siblings[idx], siblings[target]] = [siblings[target], siblings[idx]];
          // Reassign order
          const orderMap = new Map(siblings.map((f, i) => [f.id, i]));
          return {
            fields: s.fields.map((f) =>
              orderMap.has(f.id) ? { ...f, order: orderMap.get(f.id)! } : f,
            ),
          };
        }),

      getFieldsForProject: (projectId) =>
        get()
          .fields.filter((f) => f.projectId === projectId)
          .sort((a, b) => a.order - b.order),
    }),
    { name: 'jira-clone-custom-fields' },
  ),
);
