'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
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
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { useIssuesStore, applyFilters, type IssueFilters } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { IssueFiltersBar } from '@/components/issue/issue-filters';
import { IssueRow } from '@/components/issue/issue-row';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';
import { SprintSection } from '@/components/sprint/sprint-section';
import { QuickFilterBar, matchQuickFilterId } from '@/components/issue/quick-filter-bar';
import { useQuickFiltersStore } from '@/lib/quick-filters-store';
import type { Issue } from '@/lib/types';

export function BacklogView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const issues = useIssuesStore((s) => s.issues);
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const createSprint = useSprintsStore((s) => s.createSprint);
  const getSprintsByProject = useSprintsStore((s) => s.getSprintsByProject);
  const user = useAuthStore((s) => s.user);
  const forProject = useQuickFiltersStore((s) => s.forProject);

  const sprintsByProject = project ? getSprintsByProject(project.id) : [];

  const [filters, setFilters] = useState<IssueFilters>({});
  const [activeQuickId, setActiveQuickId] = useState('__all');
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSprintTargetId, setCreateSprintTargetId] = useState<string | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filtered = useMemo(() => {
    if (!project) return [];
    return applyFilters(
      issues.filter((i) => i.projectId === project.id),
      filters,
      user?.id,
    ).sort((a, b) => a.rank - b.rank);
  }, [project, issues, filters, user?.id]);

  const visibleSprints = useMemo(
    () => sprintsByProject.filter((s) => s.state !== 'completed'),
    [sprintsByProject],
  );

  const sprintIssues = (sprintId: string) =>
    filtered.filter((i) => i.sprintId === sprintId);

  const backlogIssues = filtered.filter((i) => !i.sprintId);

  const activeIssue = useMemo(
    () => (activeId ? issues.find((i) => i.id === activeId) ?? null : null),
    [activeId, issues],
  );

  if (!project || !user) return null;

  const handleFiltersChange = (next: IssueFilters) => {
    setFilters(next);
    setActiveQuickId(matchQuickFilterId(project.id, next, forProject));
  };

  const handleQuickChange = (id: string, qf: IssueFilters) => {
    setActiveQuickId(id);
    setFilters(qf);
  };

  const canCreate = hasPermission(user.role, 'issues.create');
  const canManage = hasPermission(user.role, 'projects.edit');
  const canEdit = hasPermission(user.role, 'issues.edit');

  const onOpenCreate = (sprintId?: string) => {
    setCreateSprintTargetId(sprintId);
    setCreateOpen(true);
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!canEdit || !user) return;
    const { active, over } = e;
    if (!over) return;

    const activeData = active.data.current as { issue?: Issue } | undefined;
    const overData = over.data.current as
      | { type?: string; sprintId?: string; isBacklog?: boolean; issue?: Issue }
      | undefined;
    const movedIssue = activeData?.issue;
    if (!movedIssue) return;

    // Determine target sprint
    let targetSprintId: string | undefined | null = null; // null = unchanged
    if (overData?.type === 'sprint-section') {
      targetSprintId = overData.isBacklog ? undefined : overData.sprintId;
    } else if (overData?.issue) {
      // Dropped onto another issue → join its container
      targetSprintId = overData.issue.sprintId;
    }

    if (targetSprintId === null) return;
    if (targetSprintId === movedIssue.sprintId) return;

    updateIssue(movedIssue.id, { sprintId: targetSprintId ?? undefined }, user.id);
  };

  return (
    <div className="space-y-4">
      <QuickFilterBar
        projectId={project.id}
        userId={user.id}
        userRole={user.role}
        filters={filters}
        activeQuickId={activeQuickId}
        onQuickChange={handleQuickChange}
      />
      <IssueFiltersBar filters={filters} onChange={handleFiltersChange} projectId={project.id} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {visibleSprints.map((sprint) => (
          <SprintSection
            key={sprint.id}
            containerId={sprint.id}
            sprint={sprint}
            issues={sprintIssues(sprint.id)}
            onCreate={canCreate ? () => onOpenCreate(sprint.id) : undefined}
            onOpenIssue={setOpenIssueId}
          />
        ))}

        <SprintSection
          containerId="backlog"
          issues={backlogIssues}
          onCreate={canCreate ? () => onOpenCreate(undefined) : undefined}
          onOpenIssue={setOpenIssueId}
        />

        <DragOverlay>
          {activeIssue ? (
            <div className="opacity-90 shadow-lg">
              <IssueRow issue={activeIssue} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {canManage && (
        <Button
          variant="outline"
          className="cursor-pointer gap-1.5"
          onClick={() => createSprint({ projectId: project.id })}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Create sprint
        </Button>
      )}

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
      <CreateIssueDialogWithSprint
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={project.id}
        sprintId={createSprintTargetId}
        onCreated={(id) => setOpenIssueId(id)}
      />
    </div>
  );
}

function CreateIssueDialogWithSprint({
  open, onClose, projectId, sprintId, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sprintId?: string;
  onCreated: (id: string) => void;
}) {
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const user = useAuthStore((s) => s.user);

  return (
    <CreateIssueDialog
      open={open}
      onClose={onClose}
      defaultProjectId={projectId}
      defaultStatus={sprintId ? 'todo' : 'backlog'}
      onCreated={(id) => {
        if (sprintId && user) {
          updateIssue(id, { sprintId }, user.id);
        }
        onCreated(id);
      }}
    />
  );
}
