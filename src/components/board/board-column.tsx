'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Issue, IssueStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BoardCard } from './board-card';

interface BoardColumnProps {
  status: IssueStatus;
  issues: Issue[];
  onOpenIssue: (id: string) => void;
  onCreate?: (status: IssueStatus) => void;
}

export function BoardColumn({ status, issues, onOpenIssue, onCreate }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status, type: 'column' },
  });

  return (
    <div className="flex w-72 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {STATUS_LABELS[status]}
          </span>
          <span className="rounded-full bg-background px-1.5 text-[11px] font-medium text-muted-foreground">
            {issues.length}
          </span>
        </div>
        {onCreate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-pointer"
            onClick={() => onCreate(status)}
            aria-label={`Add issue to ${STATUS_LABELS[status]}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-2 px-2 pb-2 min-h-[120px] rounded-lg transition-colors',
          isOver && 'bg-primary/5',
        )}
      >
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <BoardCard key={issue.id} issue={issue} onOpen={onOpenIssue} />
          ))}
        </SortableContext>
        {issues.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
