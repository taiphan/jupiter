'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import {
  ArrowDown, ArrowUp, ArrowUpDown, Columns3, ChevronDown, ChevronRight, Trash2, UserCheck, Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useProjectsStore } from '@/lib/projects-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useIssuesStore } from '@/lib/issues-store';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/lib/auth-store';
import type { Issue, IssueStatus, Member, Priority, Project, Sprint } from '@/lib/types';
import {
  ISSUE_TYPE_LABELS, PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS,
} from '@/lib/types';
import { canTransition as isWorkflowTransitionAllowed, getAllowedTargets } from '@/lib/workflow-transitions';
import type { UserRole } from '@/lib/auth-store';
import { IssueTypeIcon } from './issue-icon';
import { PriorityIcon } from './priority-icon';
import { UserAvatar } from './user-avatar';
import { formatDueDate, isOverdue } from '@/lib/derive/due-date';
import { useVersionsStore } from '@/lib/versions-store';
import { cn } from '@/lib/utils';

export type ListSortKey = 'key' | 'status' | 'priority' | 'dueDate' | 'updatedAt' | 'points';
export type ListColumn = 'key' | 'type' | 'summary' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'sprint' | 'points' | 'labels' | 'versions';
export type GroupBy = 'none' | 'epic' | 'status' | 'sprint' | 'assignee' | 'priority';

export const ALL_COLUMNS: ListColumn[] = [
  'key', 'type', 'summary', 'status', 'priority', 'assignee', 'dueDate', 'sprint', 'points', 'labels', 'versions',
];
const DEFAULT_COLUMNS: ListColumn[] = [
  'key', 'type', 'summary', 'status', 'priority', 'assignee', 'dueDate', 'sprint', 'versions', 'points',
];
export const COLUMN_LABELS: Record<ListColumn, string> = {
  key: 'Key', type: 'Type', summary: 'Summary', status: 'Status', priority: 'Priority',
  assignee: 'Assignee', dueDate: 'Due date', sprint: 'Sprint', points: 'Points', labels: 'Labels', versions: 'Fix versions',
};
export const GROUP_BY_LABELS: Record<GroupBy, string> = {
  none: 'No grouping', epic: 'Epic', status: 'Status', sprint: 'Sprint',
  assignee: 'Assignee', priority: 'Priority',
};

function loadColumns(projectId: string): ListColumn[] {
  try {
    const raw = localStorage.getItem(`jupiter-list-columns:${projectId}`);
    if (raw) return JSON.parse(raw) as ListColumn[];
  } catch { /* ignore */ }
  return DEFAULT_COLUMNS;
}
function saveColumns(projectId: string, cols: ListColumn[]) {
  try { localStorage.setItem(`jupiter-list-columns:${projectId}`, JSON.stringify(cols)); } catch { /* ignore */ }
}

interface IssueListTableProps {
  issues: Issue[];
  projectId: string;
  groupBy?: GroupBy;
  onOpenIssue: (issue: Issue) => void;
}

export function IssueListTable({ issues, projectId, groupBy = 'none', onOpenIssue }: IssueListTableProps) {
  const members = useProjectsStore((s) => s.members);
  const projects = useProjectsStore((s) => s.projects);
  const getSprintsByProject = useSprintsStore((s) => s.getSprintsByProject);
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const deleteIssue = useIssuesStore((s) => s.deleteIssue);
  const user = useAuthStore((s) => s.user);
  const sprints = getSprintsByProject(projectId);
  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId],
  );
  const projectMembers = useMemo(() => {
    return project ? members.filter((m) => project.memberIds.includes(m.id)) : members;
  }, [members, project]);
  const userRole = user?.role;

  const [sortKey, setSortKey] = useState<ListSortKey>('key');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [columns, setColumnsState] = useState<ListColumn[]>(() => loadColumns(projectId));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const canEdit = hasPermission(user?.role, 'issues.edit');
  const canDelete = hasPermission(user?.role, 'issues.delete');
  const canTransition = hasPermission(user?.role, 'issues.transition');

  const setColumns = useCallback((cols: ListColumn[]) => {
    setColumnsState(cols);
    saveColumns(projectId, cols);
  }, [projectId]);

  const sorted = useMemo(() => {
    const list = [...issues];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'key': cmp = a.key.localeCompare(b.key); break;
        case 'status': cmp = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status); break;
        case 'priority': cmp = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority); break;
        case 'dueDate': cmp = (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'); break;
        case 'updatedAt': cmp = a.updatedAt.localeCompare(b.updatedAt); break;
        case 'points': cmp = (a.storyPoints ?? -1) - (b.storyPoints ?? -1); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [issues, sortKey, sortDir]);

  // Build grouped rows
  const groups = useMemo((): Array<{ key: string; label: string; rows: Issue[] }> => {
    if (groupBy === 'none') return [{ key: '__all', label: '', rows: sorted }];
    if (groupBy === 'epic') {
      const epicMap = new Map<string, Issue[]>();
      const noEpic: Issue[] = [];
      const epicById = new Map(sorted.filter((i) => i.type === 'epic').map((i) => [i.id, i]));
      for (const issue of sorted) {
        if (issue.type === 'epic') continue;
        if (issue.parentId && epicById.has(issue.parentId)) {
          const arr = epicMap.get(issue.parentId) ?? [];
          arr.push(issue);
          epicMap.set(issue.parentId, arr);
        } else {
          noEpic.push(issue);
        }
      }
      const result: Array<{ key: string; label: string; rows: Issue[] }> = [];
      for (const epic of sorted.filter((i) => i.type === 'epic')) {
        const children = epicMap.get(epic.id) ?? [];
        result.push({ key: epic.id, label: epic.summary, rows: [epic, ...children] });
      }
      if (noEpic.length) result.push({ key: '__none', label: 'No epic', rows: noEpic });
      return result;
    }
    if (groupBy === 'status') {
      return STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], rows: sorted.filter((i) => i.status === s) }))
        .filter((g) => g.rows.length > 0);
    }
    if (groupBy === 'priority') {
      return PRIORITIES.map((p) => ({ key: p, label: PRIORITY_LABELS[p], rows: sorted.filter((i) => i.priority === p) }))
        .filter((g) => g.rows.length > 0);
    }
    if (groupBy === 'sprint') {
      const bySprint = new Map<string, Issue[]>();
      const noSprint: Issue[] = [];
      for (const issue of sorted) {
        if (issue.sprintId) {
          const arr = bySprint.get(issue.sprintId) ?? [];
          arr.push(issue);
          bySprint.set(issue.sprintId, arr);
        } else {
          noSprint.push(issue);
        }
      }
      const result: Array<{ key: string; label: string; rows: Issue[] }> = [];
      for (const sprint of sprints) {
        if (bySprint.has(sprint.id)) result.push({ key: sprint.id, label: sprint.name, rows: bySprint.get(sprint.id)! });
      }
      if (noSprint.length) result.push({ key: '__none', label: 'No sprint', rows: noSprint });
      return result;
    }
    if (groupBy === 'assignee') {
      const byAssignee = new Map<string, Issue[]>();
      const unassigned: Issue[] = [];
      for (const issue of sorted) {
        if (issue.assigneeId) {
          const arr = byAssignee.get(issue.assigneeId) ?? [];
          arr.push(issue);
          byAssignee.set(issue.assigneeId, arr);
        } else {
          unassigned.push(issue);
        }
      }
      const result: Array<{ key: string; label: string; rows: Issue[] }> = [];
      for (const member of members) {
        if (byAssignee.has(member.id)) result.push({ key: member.id, label: member.name, rows: byAssignee.get(member.id)! });
      }
      if (unassigned.length) result.push({ key: '__none', label: 'Unassigned', rows: unassigned });
      return result;
    }
    return [{ key: '__all', label: '', rows: sorted }];
  }, [sorted, groupBy, sprints, members]);

  const allIds = useMemo(() => sorted.map((i) => i.id), [sorted]);
  const allSelected = selected.size > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const bulkUpdate = (patch: Partial<Issue>) => {
    if (!user) return;
    for (const id of selected) {
      updateIssue(id, patch, user.id);
    }
    setSelected(new Set());
  };
  const bulkDelete = () => {
    if (!user) return;
    for (const id of selected) deleteIssue(id);
    setSelected(new Set());
  };

  const toggleSort = (key: ListSortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortable: Partial<Record<ListColumn, ListSortKey>> = {
    key: 'key', status: 'status', priority: 'priority', dueDate: 'dueDate', points: 'points',
  };

  const SortIcon = ({ col }: { col: ListSortKey }) =>
    sortKey !== col
      ? <ArrowUpDown className="h-3 w-3 opacity-40" />
      : sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;

  if (sorted.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No issues match your filters.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toolbar: column picker */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{sorted.length} issue{sorted.length !== 1 ? 's' : ''}</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="cursor-pointer gap-1.5 text-xs">
                <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
                Columns
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">Show / hide columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col}
                checked={columns.includes(col)}
                disabled={col === 'summary'}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...columns, col].sort((a, b) => ALL_COLUMNS.indexOf(a) - ALL_COLUMNS.indexOf(b))
                    : columns.filter((c) => c !== col);
                  setColumns(next.length > 1 ? next : columns);
                }}
              >
                {COLUMN_LABELS[col]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium">{selected.size} selected</span>
          {canTransition && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="xs" className="cursor-pointer gap-1 text-xs"><Tag className="h-3 w-3" />Status</Button>} />
              <DropdownMenuContent>
                {STATUSES.map((s) => (
                  <DropdownMenuItem key={s} className="cursor-pointer text-xs" onSelect={() => bulkUpdate({ status: s as IssueStatus })}>
                    {STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canEdit && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="xs" className="cursor-pointer gap-1 text-xs"><UserCheck className="h-3 w-3" />Assignee</Button>} />
                <DropdownMenuContent>
                  <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => bulkUpdate({ assigneeId: undefined })}>Unassigned</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {projectMembers.map((m) => (
                    <DropdownMenuItem key={m.id} className="cursor-pointer text-xs" onSelect={() => bulkUpdate({ assigneeId: m.id })}>
                      <UserAvatar member={m} size="sm" />
                      {m.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="xs" className="cursor-pointer gap-1 text-xs">Priority</Button>} />
                <DropdownMenuContent>
                  {PRIORITIES.map((p) => (
                    <DropdownMenuItem key={p} className="cursor-pointer text-xs" onSelect={() => bulkUpdate({ priority: p as Priority })}>
                      <PriorityIcon priority={p} />
                      {PRIORITY_LABELS[p]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {canDelete && (
            <Button variant="destructive" size="xs" className="cursor-pointer gap-1 text-xs ml-auto" onClick={bulkDelete}>
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          )}
          <Button variant="ghost" size="xs" className="cursor-pointer text-xs" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="cursor-pointer accent-primary"
                  aria-label="Select all"
                />
              </th>
              {columns.map((col) => {
                const sk = sortable[col];
                return (
                  <th key={col} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    {sk ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(sk)}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                      >
                        {COLUMN_LABELS[col]} <SortIcon col={sk} />
                      </button>
                    ) : COLUMN_LABELS[col]}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.key);
              return (
                <>
                  {groupBy !== 'none' && (
                    <tr key={`grp-${group.key}`} className="border-b bg-muted/20">
                      <td />
                      <td colSpan={columns.length} className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer hover:text-primary"
                        >
                          {isCollapsed
                            ? <ChevronRight className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />}
                          {group.label}
                          <span className="font-normal text-muted-foreground">({group.rows.length})</span>
                        </button>
                      </td>
                    </tr>
                  )}
                  {!isCollapsed && group.rows.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      columns={columns}
                      selected={selected.has(issue.id)}
                      onToggleSelect={() => toggleOne(issue.id)}
                      onOpenIssue={onOpenIssue}
                      members={projectMembers}
                      sprints={sprints}
                      canEdit={canEdit}
                      canTransition={canTransition}
                      userId={user?.id ?? ''}
                      userRole={userRole}
                      project={project}
                    />
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Single row with inline editing ────────────────────────────────────────

interface RowProps {
  issue: Issue;
  columns: ListColumn[];
  selected: boolean;
  onToggleSelect: () => void;
  onOpenIssue: (issue: Issue) => void;
  members: Member[];
  sprints: Sprint[];
  canEdit: boolean;
  canTransition: boolean;
  userId: string;
  userRole?: UserRole;
  project?: Project;
}

function IssueRow({
  issue, columns, selected, onToggleSelect, onOpenIssue, members, sprints,
  canEdit, canTransition, userId, userRole, project,
}: RowProps) {
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const projectVersions = useVersionsStore((s) => s.getVersionsForProject(issue.projectId));
  const [editingPoints, setEditingPoints] = useState(false);
  const [pointsVal, setPointsVal] = useState(String(issue.storyPoints ?? ''));
  const pointsRef = useRef<HTMLInputElement>(null);

  const commitPoints = () => {
    const n = pointsVal === '' ? undefined : Number(pointsVal);
    if (!Number.isNaN(n)) updateIssue(issue.id, { storyPoints: n }, userId);
    setEditingPoints(false);
  };

  const toggleFixVersion = (versionId: string) => {
    const current = issue.fixVersionIds ?? [];
    const next = current.includes(versionId)
      ? current.filter((id) => id !== versionId)
      : [...current, versionId];
    updateIssue(issue.id, { fixVersionIds: next }, userId);
  };

  const renderFixVersionBadges = (ids: string[]) => {
    if (ids.length === 0) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
      <span className="flex flex-wrap gap-0.5">
        {ids.map((id) => {
          const v = projectVersions.find((pv) => pv.id === id);
          return (
            <Badge
              key={id}
              variant={v?.released ? 'secondary' : 'outline'}
              className="text-[9px] px-1 py-0"
            >
              {v?.name ?? id}
            </Badge>
          );
        })}
      </span>
    );
  };

  const renderCell = (col: ListColumn) => {
    const assignee = issue.assigneeId ? members.find((m) => m.id === issue.assigneeId) : undefined;
    const sprint = issue.sprintId ? sprints.find((s) => s.id === issue.sprintId) : undefined;

    switch (col) {
      case 'key':
        return <span className="font-mono text-xs text-primary whitespace-nowrap">{issue.key}</span>;

      case 'type':
        return (
          <span className="flex items-center gap-1 text-xs whitespace-nowrap">
            <IssueTypeIcon type={issue.type} />
            {ISSUE_TYPE_LABELS[issue.type]}
          </span>
        );

      case 'summary':
        return <span className="truncate text-sm">{issue.summary}</span>;

      case 'status':
        if (!canTransition) return <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[issue.status]}</Badge>;
        {
          const statusOptions = STATUSES.filter(
            (s) => s === issue.status || (userRole && getAllowedTargets(userRole, issue.status, project).includes(s)),
          );
          return (
          <Select
            value={issue.status}
            onValueChange={(v) => {
              if (!v || !userRole) return;
              const next = v as IssueStatus;
              if (!isWorkflowTransitionAllowed(userRole, issue.status, next, project)) return;
              updateIssue(issue.id, { status: next }, userId);
            }}
          >
            <SelectTrigger
              className="h-6 min-w-[100px] border-0 p-0 text-[10px] shadow-none ring-0 hover:bg-muted focus:ring-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[issue.status]}</Badge>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          );
        }

      case 'priority':
        if (!canEdit) return <span className="flex items-center gap-1 text-xs"><PriorityIcon priority={issue.priority} />{PRIORITY_LABELS[issue.priority]}</span>;
        return (
          <Select value={issue.priority} onValueChange={(v) => v && updateIssue(issue.id, { priority: v as Priority }, userId)}>
            <SelectTrigger
              className="h-6 min-w-[90px] border-0 p-0 text-xs shadow-none ring-0 hover:bg-muted focus:ring-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1">
                <PriorityIcon priority={issue.priority} />
                {PRIORITY_LABELS[issue.priority]}
              </span>
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  <span className="flex items-center gap-1.5"><PriorityIcon priority={p} />{PRIORITY_LABELS[p]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'assignee':
        if (!canEdit) return (
          <span className="flex items-center gap-1.5 text-xs">
            <UserAvatar member={assignee} size="sm" />{assignee?.name ?? '—'}
          </span>
        );
        return (
          <Select
            value={issue.assigneeId ?? '__none'}
            onValueChange={(v) => {
                const aid = (v && v !== '__none') ? v : undefined;
                updateIssue(issue.id, { assigneeId: aid }, userId);
              }}
          >
            <SelectTrigger
              className="h-6 min-w-[110px] border-0 p-0 text-xs shadow-none ring-0 hover:bg-muted focus:ring-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1.5">
                <UserAvatar member={assignee} size="sm" />
                {assignee?.name ?? '—'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none" className="text-xs">Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  <span className="flex items-center gap-1.5"><UserAvatar member={m} size="sm" />{m.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'dueDate':
        return (
          <span className={cn('text-xs whitespace-nowrap', isOverdue(issue) && 'font-medium text-destructive')}>
            {formatDueDate(issue.dueDate)}
          </span>
        );

      case 'sprint':
        return <span className="text-xs text-muted-foreground whitespace-nowrap">{sprint?.name ?? '—'}</span>;

      case 'points':
        if (!canEdit) return <span className="text-xs tabular-nums">{issue.storyPoints ?? '—'}</span>;
        return editingPoints ? (
          <input
            ref={pointsRef}
            type="number"
            min={0}
            value={pointsVal}
            onChange={(e) => setPointsVal(e.target.value)}
            onBlur={commitPoints}
            onKeyDown={(e) => { if (e.key === 'Enter') commitPoints(); if (e.key === 'Escape') setEditingPoints(false); }}
            onClick={(e) => e.stopPropagation()}
            className="w-14 rounded border bg-background px-1 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPointsVal(String(issue.storyPoints ?? '')); setEditingPoints(true); }}
            className="min-w-[2rem] rounded px-1 py-0.5 text-left text-xs tabular-nums hover:bg-muted cursor-pointer"
          >
            {issue.storyPoints ?? '—'}
          </button>
        );

      case 'labels':
        return (
          <span className="flex flex-wrap gap-0.5">
            {issue.labels.length === 0
              ? <span className="text-xs text-muted-foreground">—</span>
              : issue.labels.map((l) => <Badge key={l} variant="secondary" className="text-[9px] px-1 py-0">{l}</Badge>)}
          </span>
        );

      case 'versions': {
        const ids = issue.fixVersionIds ?? [];
        if (!canEdit || projectVersions.length === 0) {
          return renderFixVersionBadges(ids);
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="min-w-[4rem] rounded px-1 py-0.5 text-left hover:bg-muted cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderFixVersionBadges(ids)}
                </button>
              }
            />
            <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel className="text-xs">Fix versions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {projectVersions.map((v) => (
                <DropdownMenuCheckboxItem
                  key={v.id}
                  className="cursor-pointer text-xs"
                  checked={ids.includes(v.id)}
                  onCheckedChange={() => toggleFixVersion(v.id)}
                >
                  <span className="flex items-center gap-1.5">
                    {v.name}
                    {v.released && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">Released</Badge>
                    )}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      default:
        return null;
    }
  };

  return (
    <tr
      className={cn('border-b last:border-b-0 hover:bg-muted/30 cursor-pointer', selected && 'bg-primary/5')}
      onClick={() => onOpenIssue(issue)}
    >
      <td className="w-8 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="cursor-pointer accent-primary"
          aria-label={`Select ${issue.key}`}
        />
      </td>
      {columns.map((col) => (
        <td
          key={col}
          className={cn(
            'px-3 py-1.5',
            col === 'summary' && 'max-w-[320px]',
            col !== 'summary' && 'whitespace-nowrap',
          )}
          onClick={col !== 'status' && col !== 'priority' && col !== 'assignee' && col !== 'points' && col !== 'versions' ? undefined : (e) => e.stopPropagation()}
        >
          {renderCell(col)}
        </td>
      ))}
    </tr>
  );
}
