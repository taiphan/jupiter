import type { Project, ProjectType } from './types';
import { STATUS_LABELS } from './types';

export type ProjectTemplateId = 'kanban' | 'scrum' | 'blank';

export interface ProjectTemplate {
  id: ProjectTemplateId;
  name: string;
  description: string;
  type: ProjectType;
  statusOverrides?: Project['statusOverrides'];
  /** Create an initial planned sprint (scrum template). */
  seedSprint?: boolean;
  seedSprintName?: string;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'kanban',
    name: 'Kanban',
    description: 'Continuous flow — To Do, In Progress, In Review, Done on the board.',
    type: 'kanban',
  },
  {
    id: 'scrum',
    name: 'Scrum',
    description: 'Sprint-based — backlog on the board, plus a starter Sprint 1.',
    type: 'scrum',
    statusOverrides: {
      backlog: { label: STATUS_LABELS.backlog, showOnBoard: true, order: 0 },
      todo: { showOnBoard: true, order: 1 },
      'in-progress': { showOnBoard: true, order: 2 },
      'in-review': { showOnBoard: true, order: 3 },
      done: { showOnBoard: true, order: 4 },
    },
    seedSprint: true,
    seedSprintName: 'Sprint 1',
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Default workflow with no extra setup.',
    type: 'kanban',
  },
];

export function getProjectTemplate(id: ProjectTemplateId): ProjectTemplate {
  const t = PROJECT_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template: ${id}`);
  return t;
}

export function templateDefaultsForCreate(
  templateId: ProjectTemplateId,
): Pick<Project, 'type' | 'statusOverrides'> {
  const t = getProjectTemplate(templateId);
  return {
    type: t.type,
    statusOverrides: t.statusOverrides,
  };
}
