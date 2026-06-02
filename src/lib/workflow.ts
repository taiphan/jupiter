import { STATUSES, STATUS_DEFAULTS } from './types';
import type { IssueStatus, Project } from './types';

export interface WorkflowColumn {
  status: IssueStatus;
  label: string;
  color: string;
  showOnBoard: boolean;
  order: number;
}

/** Compute the effective workflow for a project, applying overrides on top of defaults. */
export function getWorkflow(project?: Project | null): WorkflowColumn[] {
  const overrides = project?.statusOverrides ?? {};
  return STATUSES.map((status) => {
    const base = STATUS_DEFAULTS[status];
    const o = overrides[status] ?? {};
    return {
      status,
      label: o.label ?? base.label,
      color: o.color ?? base.color,
      showOnBoard: o.showOnBoard ?? base.showOnBoard,
      order: o.order ?? base.order,
    };
  }).sort((a, b) => a.order - b.order);
}

/** Statuses currently shown on the Kanban board, in user-defined order. */
export function getBoardColumns(project?: Project | null): WorkflowColumn[] {
  return getWorkflow(project).filter((c) => c.showOnBoard);
}

/** Look up the resolved label for a status in a project (falls back to default). */
export function getStatusLabel(project: Project | null | undefined, status: IssueStatus): string {
  return project?.statusOverrides?.[status]?.label ?? STATUS_DEFAULTS[status].label;
}
