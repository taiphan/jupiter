'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIssuesStore, applyFilters, type IssueFilters } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { IssueFiltersBar } from '@/components/issue/issue-filters';
import { IssueRow } from '@/components/issue/issue-row';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';

export default function IssuesPage() {
  const issues = useIssuesStore((s) => s.issues);
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<IssueFilters>({});
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = hasPermission(user?.role, 'issues.create');

  const filtered = useMemo(
    () => applyFilters(issues, filters, user?.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [issues, filters, user?.id],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Filters"
        description="Workspace-wide issue search"
        actions={
          canCreate ? (
            <Button size="sm" className="cursor-pointer gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create issue
            </Button>
          ) : null
        }
      />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <IssueFiltersBar filters={filters} onChange={setFilters} showProject />

          <Card>
            <CardContent className="p-3 space-y-1.5">
              {filtered.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  No issues match these filters.
                </div>
              ) : (
                filtered.map((i) => (
                  <IssueRow key={i.id} issue={i} onClick={(it) => setOpenIssueId(it.id)} showProject />
                ))
              )}
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-muted-foreground">
            Showing {filtered.length} of {issues.length} issues
          </p>
        </div>
      </main>

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setOpenIssueId(id)}
      />
    </div>
  );
}
