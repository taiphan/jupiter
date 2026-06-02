'use client';

import { useMemo, useState } from 'react';
import { useProjectsStore } from '@/lib/projects-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useIssuesStore } from '@/lib/issues-store';
import { KanbanBoard } from '@/components/board/kanban-board';
import { IssueFiltersBar } from '@/components/issue/issue-filters';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { IssueFilters } from '@/lib/issues-store';
import { formatDate } from '@/lib/utils';

export function BoardView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const sprintsByProject = useSprintsStore(
    (s) => (project ? s.getSprintsByProject(project.id) : []),
  );
  const allIssues = useIssuesStore((s) => s.issues);

  const [filters, setFilters] = useState<IssueFilters>({});
  const activeSprint = sprintsByProject.find((s) => s.state === 'active');
  const [sprintFilter, setSprintFilter] = useState<string>(activeSprint ? activeSprint.id : 'all');

  // Pre-filter issues to the chosen sprint
  const issueIdsInSprint = useMemo(() => {
    if (!project) return new Set<string>();
    if (sprintFilter === 'all') return new Set(allIssues.filter((i) => i.projectId === project.id).map((i) => i.id));
    if (sprintFilter === 'none') return new Set(
      allIssues.filter((i) => i.projectId === project.id && !i.sprintId).map((i) => i.id),
    );
    return new Set(
      allIssues.filter((i) => i.projectId === project.id && i.sprintId === sprintFilter).map((i) => i.id),
    );
  }, [project, allIssues, sprintFilter]);

  const wrappedFilters: IssueFilters = useMemo(() => ({ ...filters }), [filters]);

  const selectedSprint = sprintsByProject.find((s) => s.id === sprintFilter);

  if (!project) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sprintFilter} onValueChange={(v) => v && setSprintFilter(v)}>
          <SelectTrigger className="w-[220px]" aria-label="Sprint">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All issues</SelectItem>
            <SelectItem value="none">No sprint (backlog only)</SelectItem>
            {sprintsByProject.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} {s.state === 'active' ? '· Active' : s.state === 'completed' ? '· Done' : '· Planned'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSprint?.startDate && selectedSprint?.endDate && (
          <span className="text-[11px] text-muted-foreground">
            {formatDate(selectedSprint.startDate)} – {formatDate(selectedSprint.endDate)}
          </span>
        )}
        {selectedSprint && (
          <Badge
            variant={selectedSprint.state === 'active' ? 'default' : 'secondary'}
            className="text-[10px] capitalize"
          >
            {selectedSprint.state}
          </Badge>
        )}

        <div className="flex-1 min-w-[220px]">
          <IssueFiltersBar filters={filters} onChange={setFilters} showStatus={false} />
        </div>
      </div>

      <KanbanBoard
        projectId={project.id}
        filters={wrappedFilters}
        restrictIssueIds={sprintFilter === 'all' ? undefined : issueIdsInSprint}
      />
    </div>
  );
}
