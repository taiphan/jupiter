'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Paperclip, MessageSquare, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Issue } from '@/lib/types';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useIssueLinksStore } from '@/lib/issue-links-store';
import { IssueTypeIcon } from '@/components/issue/issue-icon';
import { PriorityIcon } from '@/components/issue/priority-icon';
import { UserAvatar } from '@/components/issue/user-avatar';
import { cn } from '@/lib/utils';

interface BoardCardProps {
  issue: Issue;
  onOpen: (id: string) => void;
}

export function BoardCard({ issue, onOpen }: BoardCardProps) {
  const assignee = useProjectsStore((s) =>
    issue.assigneeId ? s.members.find((m) => m.id === issue.assigneeId) : undefined,
  );
  const attachmentCount = useIssuesStore(
    (s) => s.attachments.filter((a) => a.issueId === issue.id).length,
  );
  const commentCount = useIssuesStore(
    (s) => s.comments.filter((c) => c.issueId === issue.id).length,
  );
  const isBlocked = useIssueLinksStore((s) => s.hasInboundBlocker(issue.id));

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: { issue },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Don't open dialog after a drag — dnd-kit fires click after pointer up.
        if (isDragging) return;
        // Suppress when ctrl/meta clicks fall through; not needed here, but keep simple
        e.stopPropagation();
        onOpen(issue.id);
      }}
      className={cn(
        'group select-none rounded-md border bg-card p-3 shadow-sm transition-shadow',
        'cursor-grab active:cursor-grabbing hover:shadow-md',
        isDragging && 'opacity-40 ring-2 ring-primary',
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(issue.id);
        }
      }}
    >
      <p className="text-sm leading-snug">{issue.summary}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {isBlocked && (
          <Badge variant="destructive" className="gap-0.5 text-[10px] px-1.5 py-0">
            <ShieldAlert className="h-2.5 w-2.5" aria-hidden="true" />
            Blocked
          </Badge>
        )}
        {issue.labels.slice(0, 3).map((l) => (
          <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <IssueTypeIcon type={issue.type} />
        <span className="font-mono text-[11px] text-muted-foreground">{issue.key}</span>
        <PriorityIcon priority={issue.priority} className="ml-1" />

        {commentCount > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <MessageSquare className="h-3 w-3" aria-hidden="true" />
            {commentCount}
          </span>
        )}
        {attachmentCount > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Paperclip className="h-3 w-3" aria-hidden="true" />
            {attachmentCount}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {issue.storyPoints != null && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold">
              {issue.storyPoints}
            </span>
          )}
          <UserAvatar member={assignee} size="sm" />
        </div>
      </div>
    </div>
  );
}
