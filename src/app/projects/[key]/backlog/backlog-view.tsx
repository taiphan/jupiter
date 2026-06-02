'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIssuesStore, applyFilters, type IssueFilters } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useSprintsStore } from '@/lib/sprints-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { IssueFiltersBar } from '@/components/issue/issue-filters';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';
import { SprintSection } from '@/components/sprint/sprint-section';

export function BacklogView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const issues = useIssuesStore((s) => s.issues);
  const sprintsByProject = useSprintsStore(
    (s) => project ? s.getSprintsByProject(project.id) : [],
  );
  const createSprint = useSprintsStore((s) => s.createSprint);
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<IssueFilters>({});
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSprintTargetId, setCreateSprintTargetId] = useState<string | undefined>(undefined);

  const filtered = useMemo(() => {
    if (!project) return [];
    return applyFilters(
      issues.filter((i) => i.projectId === project.id),
      filters,
      user?.id,
    ).sort((a, b) => a.rank - b.rank);
  }, [project, issues, filters, user?.id]);

  if (!project) return null;

  const canCreate = hasPermission(user?.role, 'issues.create');
  const canManage = hasPermission(user?.role, 'projects.edit');

  // Sprint groupings — exclude completed sprints from backlog view; show in Reports.
  const visibleSprints = sprintsByProject.filter((s) => s.state !== 'completed');

  // Issues for each sprint
  const sprintIssues = (sprintId: string) =>
    filtered.filter((i) => i.sprintId === sprintId);

  // Items not in any sprint = backlog
  const backlogIssues = filtered.filter((i) => !i.sprintId);

  const onOpenCreate = (sprintId?: string) => {
    setCreateSprintTargetId(sprintId);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-4">
      <IssueFiltersBar filters={filters} onChange={setFilters} />

      {/* Sprint sections */}
      {visibleSprints.map((sprint) => (
        <SprintSection
          key={sprint.id}
          sprint={sprint}
          issues={sprintIssues(sprint.id)}
          onCreate={canCreate ? () => onOpenCreate(sprint.id) : undefined}
          onOpenIssue={setOpenIssueId}
        />
      ))}

      {/* Backlog */}
      <SprintSection
        issues={backlogIssues}
        onCreate={canCreate ? () => onOpenCreate(undefined) : undefined}
        onOpenIssue={setOpenIssueId}
      />

      {/* Create sprint */}
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

/** Wrapper that auto-assigns the sprint after creation. */
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
