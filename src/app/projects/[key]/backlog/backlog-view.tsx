'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIssuesStore, applyFilters, type IssueFilters } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { IssueFiltersBar } from '@/components/issue/issue-filters';
import { IssueRow } from '@/components/issue/issue-row';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';
import { STATUS_LABELS, type IssueStatus } from '@/lib/types';

export function BacklogView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const issues = useIssuesStore((s) => s.issues);
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<IssueFilters>({});
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const grouped = useMemo(() => {
    if (!project) return null;
    const list = applyFilters(
      issues.filter((i) => i.projectId === project.id),
      filters,
      user?.id,
    );
    const order: IssueStatus[] = ['backlog', 'todo', 'in-progress', 'in-review', 'done'];
    const out: Record<IssueStatus, typeof list> = {
      backlog: [], todo: [], 'in-progress': [], 'in-review': [], done: [],
    };
    for (const i of list) out[i.status].push(i);
    return order.map((s) => ({ status: s, items: out[s].sort((a, b) => a.rank - b.rank) }));
  }, [project, issues, filters, user?.id]);

  if (!project || !grouped) return null;

  const canCreate = hasPermission(user?.role, 'issues.create');

  return (
    <div className="space-y-4">
      <IssueFiltersBar filters={filters} onChange={setFilters} />

      {grouped.map((g) => (
        <Card key={g.status}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {STATUS_LABELS[g.status]}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({g.items.length})
              </span>
            </CardTitle>
            {canCreate && g.status === 'backlog' && (
              <Button
                size="sm"
                variant="ghost"
                className="cursor-pointer gap-1.5 text-xs"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                Add issue
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-1.5">
            {g.items.length === 0 ? (
              <div className="flex h-12 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                No issues in {STATUS_LABELS[g.status]}
              </div>
            ) : (
              g.items.map((i) => (
                <IssueRow key={i.id} issue={i} onClick={(it) => setOpenIssueId(it.id)} />
              ))
            )}
          </CardContent>
        </Card>
      ))}

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultProjectId={project.id}
        defaultStatus="backlog"
        onCreated={(id) => setOpenIssueId(id)}
      />
    </div>
  );
}
