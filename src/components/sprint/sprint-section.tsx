'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  MoreHorizontal,
  Trash2,
  GripVertical,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Issue, Sprint } from '@/lib/types';
import { useSprintsStore } from '@/lib/sprints-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { IssueRow } from '@/components/issue/issue-row';
import { formatDate, cn } from '@/lib/utils';
import {
  StartSprintDialog,
  CompleteSprintDialog,
  RenameSprintDialog,
} from './sprint-dialogs';

interface SprintSectionProps {
  /** Stable id used by the drop zone (sprint id, or 'backlog'). */
  containerId: string;
  sprint?: Sprint; // undefined → backlog
  issues: Issue[];
  onCreate?: () => void;
  onOpenIssue: (id: string) => void;
}

export function SprintSection({
  containerId, sprint, issues, onCreate, onOpenIssue,
}: SprintSectionProps) {
  const [open, setOpen] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showRename, setShowRename] = useState(false);

  const startSprint = useSprintsStore((s) => s.startSprint);
  const completeSprint = useSprintsStore((s) => s.completeSprint);
  const deleteSprint = useSprintsStore((s) => s.deleteSprint);
  const updateSprint = useSprintsStore((s) => s.updateSprint);
  const removeIssueFromSprint = useSprintsStore((s) => s.removeIssueFromSprint);
  const addIssueToSprint = useSprintsStore((s) => s.addIssueToSprint);
  const projectSprints = useSprintsStore((s) =>
    sprint ? s.getSprintsByProject(sprint.projectId) : [],
  );
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const user = useAuthStore((s) => s.user);

  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    data: { type: 'sprint-section', sprintId: sprint?.id, isBacklog: !sprint },
  });

  const canManage = hasPermission(user?.role, 'projects.edit');
  const canEditIssues = hasPermission(user?.role, 'issues.edit');

  const completedCount = issues.filter((i) => i.status === 'done').length;
  const inProgressCount = issues.filter((i) => i.status === 'in-progress' || i.status === 'in-review').length;
  const todoCount = issues.length - completedCount - inProgressCount;
  const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

  const projectKey = useProjectsStore((s) =>
    sprint ? s.getProject(sprint.projectId)?.key : undefined,
  );
  const sprintBoardHref =
    sprint && projectKey ? `/projects/${projectKey}/sprints/${sprint.id}` : null;

  const otherSprints = sprint
    ? projectSprints.filter((s) => s.id !== sprint.id && s.state !== 'completed')
    : [];

  const isBacklog = !sprint;
  const isPlanned = sprint?.state === 'planned';
  const isActive = sprint?.state === 'active';
  const isCompleted = sprint?.state === 'completed';

  return (
    <div
      className={cn(
        'rounded-md border bg-card transition-colors',
        isOver && 'ring-2 ring-primary/40 bg-accent/20',
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center text-muted-foreground cursor-pointer"
          aria-label={open ? 'Collapse section' : 'Expand section'}
        >
          {open
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {isBacklog ? (
          <span className="text-sm font-semibold">Backlog</span>
        ) : sprintBoardHref ? (
          <Link
            href={sprintBoardHref}
            className="text-sm font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {sprint!.name}
          </Link>
        ) : (
          <span className="text-sm font-semibold">{sprint!.name}</span>
        )}

        {sprint && (
          <Badge
            variant={isActive ? 'default' : isCompleted ? 'outline' : 'secondary'}
            className="text-[10px] capitalize"
          >
            {sprint.state}
          </Badge>
        )}

        {sprint?.startDate && sprint?.endDate && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
          </span>
        )}

        <span className="ml-2 text-[11px] text-muted-foreground">
          {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {issues.length > 0 && !isBacklog && (
            <div className="hidden items-center gap-1 sm:flex">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                {todoCount}
              </span>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                {inProgressCount}
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                {completedCount}
              </span>
            </div>
          )}

          {totalPoints > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {totalPoints} pts
            </span>
          )}

          {canManage && isPlanned && (
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={() => setShowStart(true)}
              disabled={issues.length === 0}
            >
              <Play className="h-3 w-3" />
              Start sprint
            </Button>
          )}
          {canManage && isActive && (
            <Button
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={() => setShowComplete(true)}
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete sprint
            </Button>
          )}

          {canManage && sprint && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    aria-label="Sprint actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setShowRename(true)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Rename sprint
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete ${sprint.name}? Issues will return to the backlog.`)) {
                      deleteSprint(sprint.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete sprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {open && (
        <div ref={setNodeRef} className="space-y-1 p-2 min-h-[60px]">
          {issues.length === 0 ? (
            <div
              className={cn(
                'flex h-12 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground',
                isOver && 'border-primary text-primary',
              )}
            >
              {isBacklog ? 'Drag issues here to remove from sprint' : 'Drag issues here'}
            </div>
          ) : (
            <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {issues.map((i) => {
                const isSubtask = !!i.parentId && issues.some((p) => p.id === i.parentId);
                return (
                  <SortableIssueRow
                    key={i.id}
                    issue={i}
                    onOpen={onOpenIssue}
                    canEdit={canEditIssues}
                    isBacklog={isBacklog}
                    otherSprints={otherSprints}
                    allActiveSprints={projectSprints.filter((s) => s.state !== 'completed')}
                    onMoveToBacklog={() => removeIssueFromSprint(i.id)}
                    onMoveToSprint={(sprintId) => addIssueToSprint(i.id, sprintId)}
                    onToggleDone={() =>
                      user &&
                      updateIssue(i.id, { status: i.status === 'done' ? 'todo' : 'done' }, user.id)
                    }
                    depth={isSubtask ? 1 : 0}
                  />
                );
              })}
            </SortableContext>
          )}

          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Create
            </button>
          )}
        </div>
      )}

      {sprint && (
        <StartSprintDialog
          open={showStart}
          onClose={() => setShowStart(false)}
          sprint={sprint}
          issueCount={issues.length}
          onStart={(range) => {
            startSprint(sprint.id, range);
            setShowStart(false);
          }}
        />
      )}

      {sprint && (
        <CompleteSprintDialog
          open={showComplete}
          onClose={() => setShowComplete(false)}
          sprint={sprint}
          completed={completedCount}
          incomplete={issues.length - completedCount}
          otherSprints={otherSprints}
          onComplete={(opts) => {
            completeSprint(sprint.id, opts);
            setShowComplete(false);
          }}
        />
      )}

      {sprint && (
        <RenameSprintDialog
          open={showRename}
          onClose={() => setShowRename(false)}
          sprint={sprint}
          onRename={(next) => {
            updateSprint(sprint.id, next);
            setShowRename(false);
          }}
        />
      )}
    </div>
  );
}

interface SortableIssueRowProps {
  issue: Issue;
  onOpen: (id: string) => void;
  canEdit: boolean;
  isBacklog: boolean;
  otherSprints: Sprint[];
  allActiveSprints: Sprint[];
  onMoveToBacklog: () => void;
  onMoveToSprint: (sprintId: string) => void;
  onToggleDone: () => void;
  depth?: number;
}

function SortableIssueRow({
  issue, onOpen, canEdit, isBacklog, otherSprints, allActiveSprints,
  onMoveToBacklog, onMoveToSprint, onToggleDone, depth = 0,
}: SortableIssueRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: { issue, type: 'issue' },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, paddingLeft: depth > 0 ? `${depth * 20}px` : undefined }}
      className={cn('group flex items-center gap-1', isDragging && 'opacity-40')}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <IssueRow issue={issue} onClick={(it) => onOpen(it.id)} />
      </div>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="Issue actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="text-xs">
            {!isBacklog && (
              <>
                <DropdownMenuItem className="cursor-pointer" onClick={onMoveToBacklog}>
                  Move to backlog
                </DropdownMenuItem>
                {otherSprints.length > 0 && <DropdownMenuSeparator />}
                {otherSprints.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => onMoveToSprint(s.id)}
                  >
                    Move to {s.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {isBacklog && allActiveSprints.length > 0 && (
              <>
                {allActiveSprints.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => onMoveToSprint(s.id)}
                  >
                    Move to {s.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={onToggleDone}>
              Toggle done
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
