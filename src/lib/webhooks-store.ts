import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectWebhook, WebhookEvent } from './types';
import { uid } from './utils';

interface WebhooksState {
  webhooks: ProjectWebhook[];

  createWebhook: (input: {
    projectId: string;
    name: string;
    url: string;
    secret?: string;
    events: WebhookEvent[];
    enabled?: boolean;
  }) => ProjectWebhook;

  updateWebhook: (id: string, patch: Partial<Omit<ProjectWebhook, 'id' | 'projectId'>>) => void;
  deleteWebhook: (id: string) => void;
  toggleWebhook: (id: string, enabled: boolean) => void;

  getWebhooksForProject: (projectId: string) => ProjectWebhook[];
  getWebhook: (id: string) => ProjectWebhook | undefined;
}

export const useWebhooksStore = create<WebhooksState>()(
  persist(
    (set, get) => ({
      webhooks: [],

      createWebhook: ({ projectId, name, url, secret, events, enabled = true }) => {
        const hook: ProjectWebhook = {
          id: uid('whk'),
          projectId,
          name: name.trim(),
          url: url.trim(),
          secret: secret?.trim() || undefined,
          events,
          enabled,
        };
        set((s) => ({ webhooks: [...s.webhooks, hook] }));
        return hook;
      },

      updateWebhook: (id, patch) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),

      deleteWebhook: (id) =>
        set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) })),

      toggleWebhook: (id, enabled) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) => (w.id === id ? { ...w, enabled } : w)),
        })),

      getWebhooksForProject: (projectId) =>
        get().webhooks.filter((w) => w.projectId === projectId),

      getWebhook: (id) => get().webhooks.find((w) => w.id === id),
    }),
    { name: 'jupiter-webhooks' },
  ),
);
