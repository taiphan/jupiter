'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/projects-store';
import { useSprintsStore } from '@/lib/sprints-store';
import type { Issue } from '@/lib/types';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/types';
import { IssueTypeIcon } from './issue-icon';
import { UserAvatar } from './user-avatar';
import { formatDueDate, isOverdue } from '@/lib/derive/due-date';
import { cn } from '@/lib/utils';

export type ListSortKey = 'key' | 'status' | 'priority' | 'dueDate' | 'updatedAt';
export type ListColumn = 'key' | 'type' | 'summary' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'sprint' | 'points';

const DEFAULT_COLUMNS: ListColumn[] = [
  'key', 'type', 'summary', 'status', 'priority', 'assignee', 'dueDate', 'sprint', 'points',
];

const COLUMN_LABELS: Record<ListColumn, string> = {
  key: 'Key',
  type: 'Type',
  summary: 'Summary',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  dueDate: 'Due date',
  sprint: 'Sprint',
  points: 'Points',
};

interface IssueListTableProps {
  issues: Issue[];
  projectId: string;
  groupByEpic?: boolean;
  onOpenIssue: (issue: Issue) => void;
}

function loadColumns(projectId: string): ListColumn[] {
  try {
    const raw = localStorage.getItem(`jupiter-list-columns:${projectId}`);
    if (raw) return JSON.parse(raw) as ListColumn[];
  } catch { /* ignore */ }
  return DEFAULT_COLUMNS;
}

export function IssueListTable({
  issues, projectId, groupByEpic = false, onOpenIssue,
}: IssueListTableProps) {
  const members = useProjectsStore((s) => s.members);
  const getSprintsByProject = useSprintsStore((s) => s.getSprintsByProject);
  const sprints = getSprintsByProject(projectId);

  const [sortKey, setSortKey] = useState<ListSortKey>('key');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [columns] = useState(() => loadColumns(projectId));

  const sorted = useMemo(() => {
    const list = [...issues];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'key': cmp = a.key.localeCompare(b.key); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'priority': cmp = a.priority.localeCompare(b.priority); break;
        case 'dueDate': cmp = (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'); break;
        case 'updatedAt': cmp = a.updatedAt.localeCompare(b.updatedAt); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [issues, sortKey, sortDir]);

  const rows = useMemo(() => {
    if (!groupByEpic) return sorted.map((issue) => ({ issue, depth: 0 }));
    const epics = new Set(sorted.filter((i) => i.type === 'epic').map((i) => i.id));
    const out: Array<{ issue: Issue; depth: number }> = [];
    for (const epic of sorted.filter((i) => i.type === 'epic')) {
      out.push({ issue: epic, depth: 0 });
      for (const child of sorted.filter((i) => i.parentId === epic.id)) {
        out.push({ issue: child, depth: 1 });
      }
    }
    for (const issue of sorted) {
      if (issue.type === 'epic') continue;
      if (issue.parentId && epics.has(issue.parentId)) continue;
      out.push({ issue, depth: 0 });
    }
    return out;
  }, [sorted, groupByEpic]);

  const toggleSort = (key: ListSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: ListSortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  const renderCell = (col: ListColumn, issue: Issue) => {
    const assignee = issue.assigneeId ? members.find((m) => m.id === issue.assigneeId) : undefined;
    const sprint = issue.sprintId ? sprints.find((s) => s.id === issue.sprintId) : undefined;
    switch (col) {
      case 'key':
        return <span className="font-mono text-xs text-primary">{issue.key}</span>;
      case 'type':
        return (
          <span className="flex items-center gap-1 text-xs">
            <IssueTypeIcon type={issue.type} />
            {ISSUE_TYPE_LABELS[issue.type]}
          </span>
        );
      case 'summary':
        return <span className="truncate text-sm">{issue.summary}</span>;
      case 'status':
        return <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[issue.status]}</Badge>;
      case 'priority':
        return <span className="text-xs">{PRIORITY_LABELS[issue.priority]}</span>;
      case 'assignee':
        return (
          <span className="flex items-center gap-1.5 text-xs">
            <UserAvatar member={assignee} size="sm" />
            {assignee?.name ?? '—'}
          </span>
        );
      case 'dueDate':
        return (
          <span className={cn('text-xs', isOverdue(issue) && 'font-medium text-destructive')}>
            {formatDueDate(issue.dueDate)}
            {isOverdue(issue) && ' · Overdue'}
          </span>
        );
      case 'sprint':
        return <span className="text-xs text-muted-foreground">{sprint?.name ?? '—'}</span>;
      case 'points':
        return <span className="text-xs tabular-nums">{issue.storyPoints ?? '—'}</span>;
      default:
        return null;
    }
  };

  const sortable: Partial<Record<ListColumn, ListSortKey>> = {
    key: 'key',
    status: 'status',
    priority: 'priority',
    dueDate: 'dueDate',
  };

  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No issues match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            {columns.map((col) => {
              const sk = sortable[col];
              return (
                <th key={col} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {sk ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(sk)}
                      className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                    >
                      {COLUMN_LABELS[col]}
                      <SortIcon col={sk} />
                    </button>
                  ) : COLUMN_LABELS[col]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ issue, depth }) => (
            <tr
              key={issue.id}
              onClick={() => onOpenIssue(issue)}
              className="border-b last:border-b-0 hover:bg-muted/40 cursor-pointer"
            >
              {columns.map((col, idx) => (
                <td
                  key={col}
                  className="max-w-[280px] px-3 py-2"
                  style={idx === columns.indexOf('summary') ? { paddingLeft: `${12 + depth * 16}px` } : undefined}
                >
                  {renderCell(col, issue)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
