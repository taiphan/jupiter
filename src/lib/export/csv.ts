import type { Issue, Member, Project } from '@/lib/types';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/types';
import type { VelocityRow } from '@/lib/derive/report-metrics';

function escapeCsv(value: string | number | undefined | null): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | number | undefined | null)[]): string {
  return cells.map(escapeCsv).join(',');
}

export function issuesToCsv(
  issues: Issue[],
  opts: {
    members: Member[];
    projects: Project[];
    resolveSprintName?: (sprintId: string | undefined) => string;
  },
): string {
  const memberName = (id?: string) =>
    opts.members.find((m) => m.id === id)?.name ?? '';
  const projectKey = (id: string) =>
    opts.projects.find((p) => p.id === id)?.key ?? id;

  const header = csvRow([
    'Key',
    'Project',
    'Type',
    'Summary',
    'Status',
    'Priority',
    'Assignee',
    'Reporter',
    'Story Points',
    'Due Date',
    'Sprint',
    'Labels',
    'Created',
    'Updated',
  ]);

  const rows = issues.map((i) =>
    csvRow([
      i.key,
      projectKey(i.projectId),
      ISSUE_TYPE_LABELS[i.type],
      i.summary,
      STATUS_LABELS[i.status],
      PRIORITY_LABELS[i.priority],
      memberName(i.assigneeId),
      memberName(i.reporterId),
      i.storyPoints ?? '',
      i.dueDate ?? '',
      opts.resolveSprintName?.(i.sprintId) ?? '',
      i.labels.join('; '),
      i.createdAt,
      i.updatedAt,
    ]),
  );

  return [header, ...rows].join('\n');
}

export function velocityToCsv(rows: VelocityRow[]): string {
  const header = csvRow(['Sprint', 'Committed Pts', 'Completed Pts', 'Issues', 'Done']);
  const lines = rows.map((r) =>
    csvRow([r.name, r.committed, r.completed, r.issues, r.done]),
  );
  return [header, ...lines].join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
