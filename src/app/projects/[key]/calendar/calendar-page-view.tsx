'use client';

import { useMemo, useState } from 'react';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore, applyFilters, type IssueFilters } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { CalendarView } from '@/components/issue/calendar-view';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';

export function ProjectCalendarView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const issues = useIssuesStore((s) => s.issues);
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const user = useAuthStore((s) => s.user);

  const [filters] = useState<IssueFilters>({});
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDueDate, setCreateDueDate] = useState<string | undefined>();

  const filtered = useMemo(() => {
    if (!project) return [];
    return applyFilters(
      issues.filter((i) => i.projectId === project.id),
      filters,
      user?.id,
    );
  }, [project, issues, filters, user?.id]);

  if (!project || !user) return null;

  const canEdit = hasPermission(user.role, 'issues.edit');
  const canCreate = hasPermission(user.role, 'issues.create');

  return (
    <div className="p-4 sm:p-6 lg:px-8">
      <CalendarView
        projectKey={projectKey}
        issues={filtered}
        canEdit={canEdit}
        onOpenIssue={(issue) => setOpenIssueId(issue.id)}
        onCreateOnDate={(date) => {
          if (!canCreate) return;
          setCreateDueDate(date);
          setCreateOpen(true);
        }}
        onMoveDueDate={(issueId, dueDate) => {
          updateIssue(issueId, { dueDate }, user.id);
        }}
      />

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
      <CreateIssueDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateDueDate(undefined);
        }}
        defaultProjectId={project.id}
        defaultDueDate={createDueDate}
        onCreated={(id) => setOpenIssueId(id)}
      />
    </div>
  );
}
