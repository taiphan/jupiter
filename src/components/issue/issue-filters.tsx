'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ISSUE_TYPES, ISSUE_TYPE_LABELS,
  PRIORITIES, PRIORITY_LABELS,
  STATUSES, STATUS_LABELS,
} from '@/lib/types';
import type { IssueFilters } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useVersionsStore } from '@/lib/versions-store';

interface IssueFiltersBarProps {
  filters: IssueFilters;
  onChange: (next: IssueFilters) => void;
  showStatus?: boolean;
  showProject?: boolean;
  /** When set, show fix-version filter scoped to this project */
  projectId?: string;
}

export function IssueFiltersBar({
  filters, onChange, showStatus = true, showProject = false, projectId,
}: IssueFiltersBarProps) {
  const projects = useProjectsStore((s) => s.projects);
  const members = useProjectsStore((s) => s.members);
  const versions = useVersionsStore((s) =>
    projectId ? s.getVersionsForProject(projectId) : [],
  );

  const set = <K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder="Search issues..."
          value={filters.search ?? ''}
          onChange={(e) => set('search', e.target.value)}
          className="pl-9"
          aria-label="Search issues"
        />
      </div>

      {showProject && (
        <Select
          value={filters.projectId ?? 'all'}
          onValueChange={(v) => set('projectId', !v || v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[140px]" aria-label="Project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showStatus && (
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) => v && set('status', v as IssueFilters['status'])}
        >
          <SelectTrigger className="w-[140px]" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.type ?? 'all'}
        onValueChange={(v) => v && set('type', v as IssueFilters['type'])}
      >
        <SelectTrigger className="w-[120px]" aria-label="Type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {ISSUE_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{ISSUE_TYPE_LABELS[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? 'all'}
        onValueChange={(v) => v && set('priority', v as IssueFilters['priority'])}
      >
        <SelectTrigger className="w-[120px]" aria-label="Priority">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assigneeId ?? 'all'}
        onValueChange={(v) => v && set('assigneeId', v as IssueFilters['assigneeId'])}
      >
        <SelectTrigger className="w-[160px]" aria-label="Assignee">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assignees</SelectItem>
          <SelectItem value="me">Assigned to me</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {projectId && versions.length > 0 && (
        <Select
          value={filters.fixVersionId ?? 'all'}
          onValueChange={(v) => v && set('fixVersionId', v as IssueFilters['fixVersionId'])}
        >
          <SelectTrigger className="w-[150px]" aria-label="Fix version">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All versions</SelectItem>
            <SelectItem value="none">No version</SelectItem>
            {versions.map((ver) => (
              <SelectItem key={ver.id} value={ver.id}>{ver.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
