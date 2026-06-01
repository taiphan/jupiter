'use client';

import { useState } from 'react';
import { useProjectsStore } from '@/lib/projects-store';
import { KanbanBoard } from '@/components/board/kanban-board';
import { IssueFiltersBar } from '@/components/issue/issue-filters';
import type { IssueFilters } from '@/lib/issues-store';

export function BoardView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const [filters, setFilters] = useState<IssueFilters>({});

  if (!project) return null;

  return (
    <div className="space-y-4">
      <IssueFiltersBar
        filters={filters}
        onChange={setFilters}
        showStatus={false}
      />
      <KanbanBoard projectId={project.id} filters={filters} />
    </div>
  );
}
