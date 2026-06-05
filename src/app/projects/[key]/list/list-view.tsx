'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useProjectsStore } from '@/lib/projects-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useIssuesStore, applyFilters, type IssueFilters } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import { IssueFiltersBar } from '@/components/issue/issue-filters';
import { IssueListTable, GROUP_BY_LABELS, type GroupBy } from '@/components/issue/issue-list-table';
import { QuickFilterBar, matchQuickFilterId } from '@/components/issue/quick-filter-bar';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { useQuickFiltersStore } from '@/lib/quick-filters-store';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { downloadCsv, issuesToCsv } from '@/lib/export/csv';
import { useVersionsStore } from '@/lib/versions-store';
import type { Issue } from '@/lib/types';

export function ListView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const allProjects = useProjectsStore((s) => s.projects);
  const members = useProjectsStore((s) => s.members);
  const issues = useIssuesStore((s) => s.issues);
  const getSprintsByProject = useSprintsStore((s) => s.getSprintsByProject);
  const versions = useVersionsStore((s) => s.versions);
  const user = useAuthStore((s) => s.user);
  const forProject = useQuickFiltersStore((s) => s.forProject);

  const [filters, setFilters] = useState<IssueFilters>({});
  const [activeQuickId, setActiveQuickId] = useState('__all');
  const [sprintFilter, setSprintFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
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

  const handleExport = () => {
    const csv = issuesToCsv(filtered, {
      members,
      projects: allProjects,
      resolveSprintName: (id) => sprints.find((s) => s.id === id)?.name ?? '',
      resolveVersionNames: (ids) =>
        ids.map((id) => versions.find((v) => v.id === id)?.name ?? id).join('; '),
    });
    downloadCsv(`${project.key}-list-${new Date().toISOString().slice(0, 10)}`, csv);
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
          <SelectTrigger className="w-[180px]" aria-label="Sprint">
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

        <Select value={groupBy} onValueChange={(v) => v && setGroupBy(v as GroupBy)}>
          <SelectTrigger className="w-[160px]" aria-label="Group by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(GROUP_BY_LABELS) as GroupBy[]).map((g) => (
              <SelectItem key={g} value={g}>{GROUP_BY_LABELS[g]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer gap-1.5 text-xs ml-auto"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      <IssueListTable
        issues={filtered}
        projectId={project.id}
        groupBy={groupBy}
        onOpenIssue={(issue: Issue) => setOpenIssueId(issue.id)}
      />

      <p className="text-center text-[11px] text-muted-foreground">
        {filtered.length} issue{filtered.length !== 1 ? 's' : ''}
        {activeSprint ? ` · Active sprint: ${activeSprint.name}` : ''}
      </p>

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
    </div>
  );
}
