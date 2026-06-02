'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Issue, IssueStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BoardCard } from './board-card';

interface BoardColumnProps {
  status: IssueStatus;
  /** Resolved column label (may be project-overridden) */
  label: string;
  /** Resolved column color (hex) */
  color: string;
  issues: Issue[];
  onOpenIssue: (id: string) => void;
  onCreate?: (status: IssueStatus) => void;
}

export function BoardColumn({
  status, label, color, issues, onOpenIssue, onCreate,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status, type: 'column' },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-md border bg-muted/40 transition-colors',
        isOver && 'ring-2 ring-primary/40 bg-accent/30',
      )}
    >
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">{issues.length}</span>
        </div>
        {onCreate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={() => onCreate(status)}
            aria-label={`Add issue to ${label}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 min-h-[120px]">
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <BoardCard key={issue.id} issue={issue} onOpen={onOpenIssue} />
          ))}
        </SortableContext>
        {issues.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">
            No issues
          </div>
        )}
        {onCreate && (
          <button
            type="button"
            onClick={() => onCreate(status)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Create
          </button>
        )}
      </div>
    </div>
  );
}
