'use client';

import { useMemo, useState } from 'react';
import { LayoutList } from 'lucide-react';
import { useProjectsStore } from '@/lib/projects-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useIssuesStore, applyFilters, type IssueFilters } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import { IssueFiltersBar } from '@/components/issue/issue-filters';
import { IssueListTable } from '@/components/issue/issue-list-table';
import { QuickFilterBar, matchQuickFilterId } from '@/components/issue/quick-filter-bar';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { useQuickFiltersStore } from '@/lib/quick-filters-store';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Issue } from '@/lib/types';

export function ListView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const issues = useIssuesStore((s) => s.issues);
  const getSprintsByProject = useSprintsStore((s) => s.getSprintsByProject);
  const user = useAuthStore((s) => s.user);
  const forProject = useQuickFiltersStore((s) => s.forProject);

  const [filters, setFilters] = useState<IssueFilters>({});
  const [activeQuickId, setActiveQuickId] = useState('__all');
  const [sprintFilter, setSprintFilter] = useState('all');
  const [groupByEpic, setGroupByEpic] = useState(false);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);

  const sprints = project ? getSprintsByProject(project.id) : [];
  const activeSprint = sprints.find((s) => s.state === 'active');

  const filtered = useMemo(() => {
    if (!project) return [];
    let list = applyFilters(
      issues.filter((i) => i.projectId === project.id),
      filters,
      user?.id,
    );
    if (sprintFilter === 'none') list = list.filter((i) => !i.sprintId);
    else if (sprintFilter !== 'all') list = list.filter((i) => i.sprintId === sprintFilter);
    return list;
  }, [project, issues, filters, user?.id, sprintFilter]);

  if (!project || !user) return null;

  const handleFiltersChange = (next: IssueFilters) => {
    setFilters(next);
    setActiveQuickId(matchQuickFilterId(project.id, next, forProject));
  };

  const handleQuickChange = (id: string, qf: IssueFilters) => {
    setActiveQuickId(id);
    setFilters(qf);
  };

  return (
    <div className="space-y-3 p-4 sm:p-6 lg:px-8">
      <QuickFilterBar
        projectId={project.id}
        userId={user.id}
        userRole={user.role}
        filters={filters}
        activeQuickId={activeQuickId}
        onQuickChange={handleQuickChange}
      />

      <div className="flex flex-wrap items-center gap-2">
        <IssueFiltersBar filters={filters} onChange={handleFiltersChange} showStatus />
        <Select value={sprintFilter} onValueChange={(v) => v && setSprintFilter(v)}>
          <SelectTrigger className="w-[200px]" aria-label="Sprint">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sprints</SelectItem>
            <SelectItem value="none">No sprint</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={groupByEpic ? 'secondary' : 'outline'}
          size="sm"
          className="cursor-pointer gap-1.5 text-xs"
          onClick={() => setGroupByEpic((v) => !v)}
        >
          <LayoutList className="h-3.5 w-3.5" />
          {groupByEpic ? 'Grouped by epic' : 'Flat list'}
        </Button>
      </div>

      <IssueListTable
        issues={filtered}
        projectId={project.id}
        groupByEpic={groupByEpic}
        onOpenIssue={(issue: Issue) => setOpenIssueId(issue.id)}
      />

      <p className="text-center text-[11px] text-muted-foreground">
        Showing {filtered.length} issues
        {activeSprint ? ` · Active sprint: ${activeSprint.name}` : ''}
      </p>

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
    </div>
  );
}
