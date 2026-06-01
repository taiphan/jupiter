'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { useIssuesStore, applyFilters, type IssueFilters } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import type { IssueStatus } from '@/lib/types';
import { BOARD_STATUSES } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { BoardColumn } from './board-column';
import { BoardCard } from './board-card';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';

interface KanbanBoardProps {
  projectId: string;
  filters?: Omit<IssueFilters, 'status'>;
}

export function KanbanBoard({ projectId, filters }: KanbanBoardProps) {
  const issues = useIssuesStore((s) => s.issues);
  const moveIssue = useIssuesStore((s) => s.moveIssue);
  const user = useAuthStore((s) => s.user);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<IssueStatus>('todo');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const canTransition = hasPermission(user?.role, 'issues.transition');
  const canCreate = hasPermission(user?.role, 'issues.create');

  // Group issues by column, applying filters (status filter is forced to 'all')
  const columns = useMemo(() => {
    const projectIssues = applyFilters(
      issues.filter((i) => i.projectId === projectId),
      { ...filters, status: 'all' },
      user?.id,
    );
    const out: Record<IssueStatus, typeof projectIssues> = {
      backlog: [], todo: [], 'in-progress': [], 'in-review': [], done: [],
    };
    for (const i of projectIssues) {
      if (BOARD_STATUSES.includes(i.status)) out[i.status].push(i);
    }
    for (const s of BOARD_STATUSES) out[s].sort((a, b) => a.rank - b.rank);
    return out;
  }, [issues, projectId, filters, user?.id]);

  const activeIssue = activeId ? issues.find((i) => i.id === activeId) ?? null : null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!canTransition || !user) return;

    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { issue?: { id: string; status: IssueStatus } } | undefined;
    const overData = over.data.current as { type?: string; status?: IssueStatus; issue?: { id: string; status: IssueStatus } } | undefined;
    const activeIssue = activeData?.issue;
    if (!activeIssue) return;

    // Determine target column and target index
    let toStatus: IssueStatus | undefined;
    let toIndex: number | undefined;

    if (overData?.type === 'column' && overData.status) {
      toStatus = overData.status;
      toIndex = columns[toStatus].length; // append
    } else if (overData?.issue) {
      toStatus = overData.issue.status;
      const list = columns[toStatus];
      const overIndex = list.findIndex((i) => i.id === overData.issue!.id);
      if (overIndex < 0) return;
      // If we moved within the same column, mimic arrayMove for index calculation
      if (activeIssue.status === toStatus) {
        const fromIndex = list.findIndex((i) => i.id === activeIssue.id);
        if (fromIndex < 0) return;
        const reordered = arrayMove(list, fromIndex, overIndex);
        toIndex = reordered.findIndex((i) => i.id === activeIssue.id);
      } else {
        toIndex = overIndex;
      }
    }

    if (!toStatus) return;
    moveIssue({ id: activeIssue.id, toStatus, toIndex, actorId: user.id });
  };

  const openCreate = (status: IssueStatus) => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              issues={columns[status]}
              onOpenIssue={setOpenIssueId}
              onCreate={canCreate ? openCreate : undefined}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue ? <BoardCard issue={activeIssue} onOpen={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultProjectId={projectId}
        defaultStatus={createStatus}
        onCreated={(id) => setOpenIssueId(id)}
      />
    </>
  );
}
