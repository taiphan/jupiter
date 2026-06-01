'use client';

import { Badge } from '@/components/ui/badge';
import type { Issue } from '@/lib/types';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/types';
import { useProjectsStore } from '@/lib/projects-store';
import { IssueTypeIcon } from './issue-icon';
import { PriorityIcon } from './priority-icon';
import { UserAvatar } from './user-avatar';

interface IssueRowProps {
  issue: Issue;
  onClick?: (issue: Issue) => void;
  showProject?: boolean;
}

export function IssueRow({ issue, onClick, showProject = false }: IssueRowProps) {
  const project = useProjectsStore((s) => s.getProject(issue.projectId));
  const assignee = useProjectsStore((s) =>
    issue.assigneeId ? s.members.find((m) => m.id === issue.assigneeId) : undefined,
  );

  return (
    <button
      type="button"
      onClick={() => onClick?.(issue)}
      className="flex w-full items-center gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50 cursor-pointer"
    >
      <IssueTypeIcon type={issue.type} />
      <span className="font-mono text-xs text-muted-foreground shrink-0">{issue.key}</span>
      <span className="flex-1 truncate text-sm">{issue.summary}</span>

      {issue.labels.length > 0 && (
        <div className="hidden items-center gap-1 md:flex">
          {issue.labels.slice(0, 2).map((l) => (
            <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>
          ))}
          {issue.labels.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{issue.labels.length - 2}</span>
          )}
        </div>
      )}

      {showProject && project && (
        <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
          {project.key}
        </Badge>
      )}

      <PriorityIcon priority={issue.priority} />

      {issue.storyPoints != null && (
        <span className="hidden h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold sm:inline-flex">
          {issue.storyPoints}
        </span>
      )}

      <Badge className={`${STATUS_COLORS[issue.status]} border-0 text-[10px] hidden md:inline-flex`}>
        {STATUS_LABELS[issue.status]}
      </Badge>

      <UserAvatar member={assignee} size="sm" />
    </button>
  );
}
