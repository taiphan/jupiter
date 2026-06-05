import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DashboardWidgetId = 'velocity' | 'burndown' | 'cfd';

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  velocity: 'Velocity',
  burndown: 'Burndown',
  cfd: 'Cumulative flow',
};

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetId[] = ['velocity', 'burndown', 'cfd'];

interface DashboardState {
  /** projectId → enabled widget ids (order preserved) */
  layoutByProject: Record<string, DashboardWidgetId[]>;

  getWidgets: (projectId: string) => DashboardWidgetId[];
  setWidgets: (projectId: string, widgets: DashboardWidgetId[]) => void;
  toggleWidget: (projectId: string, widget: DashboardWidgetId) => void;
  resetWidgets: (projectId: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      layoutByProject: {},

      getWidgets: (projectId) =>
        get().layoutByProject[projectId] ?? DEFAULT_DASHBOARD_WIDGETS,

      setWidgets: (projectId, widgets) =>
        set((s) => ({
          layoutByProject: { ...s.layoutByProject, [projectId]: widgets },
        })),

      toggleWidget: (projectId, widget) => {
        const current = get().getWidgets(projectId);
        const next = current.includes(widget)
          ? current.filter((w) => w !== widget)
          : [...current, widget];
        get().setWidgets(projectId, next.length > 0 ? next : [widget]);
      },

      resetWidgets: (projectId) =>
        set((s) => ({
          layoutByProject: { ...s.layoutByProject, [projectId]: DEFAULT_DASHBOARD_WIDGETS },
        })),
    }),
    { name: 'jupiter-dashboards' },
  ),
);
