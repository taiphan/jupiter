'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { ROLE_LABELS } from '@/lib/permissions';
import { IssueRow } from '@/components/issue/issue-row';
import { IssueDialog } from '@/components/issue/issue-dialog';
import type { Issue } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { isWatching } from '@/lib/derive/watchers';
import { issuesDueSoon, recentChangesForUser } from '@/lib/derive/for-you';
import { formatDueDate, isOverdue } from '@/lib/derive/due-date';
import { timeAgo } from '@/lib/utils';

export default function MyWorkPage() {
  const user = useAuthStore((s) => s.user);
  const issues = useIssuesStore((s) => s.issues);
  const activity = useIssuesStore((s) => s.activity);
  const projects = useProjectsStore((s) => s.projects);
  const members = useProjectsStore((s) => s.members);

  const [openIssueId, setOpenIssueId] = useState<string | null>(null);

  const myAssigned = useMemo(
    () => issues
      .filter((i) => i.assigneeId === user?.id && i.status !== 'done')
      .sort((a, b) => a.status.localeCompare(b.status) || b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 8),
    [issues, user?.id],
  );

  const myReported = useMemo(
    () => issues
      .filter((i) => i.reporterId === user?.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
    [issues, user?.id],
  );

  const myWatching = useMemo(
    () => issues
      .filter(
        (i) =>
          user &&
          isWatching(i, user.id) &&
          i.status !== 'done' &&
          i.assigneeId !== user.id &&
          i.reporterId !== user.id,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5),
    [issues, user],
  );

  const dueSoon = useMemo(
    () => (user ? issuesDueSoon(issues, user.id, 7).slice(0, 6) : []),
    [issues, user],
  );

  const whatChanged = useMemo(
    () => (user ? recentChangesForUser(activity, issues, user.id, 8) : []),
    [activity, issues, user],
  );

  const recentlyUpdated = useMemo(
    () => [...issues].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [issues],
  );

  const stats = useMemo(() => {
    const open = issues.filter((i) => i.status !== 'done').length;
    const inProgress = issues.filter((i) => i.status === 'in-progress').length;
    const myOpen = issues.filter((i) => i.assigneeId === user?.id && i.status !== 'done').length;
    return { open, inProgress, myOpen };
  }, [issues, user?.id]);

  const handleOpen = (issue: Issue) => setOpenIssueId(issue.id);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Your work"
        description={user ? `Welcome back, ${user.name.split(' ')[0]} · ${ROLE_LABELS[user.role]}` : undefined}
      />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* KPI strip */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Assigned to you" value={stats.myOpen} accent="text-primary" />
            <KpiCard label="In progress" value={stats.inProgress} accent="text-blue-600 dark:text-blue-400" />
            <KpiCard label="Open across workspace" value={stats.open} accent="text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* Assigned to me */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Assigned to me</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Open issues where you&apos;re the assignee
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer gap-1.5 text-xs"
                render={<Link href="/issues" />}
              >
                View all
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {myAssigned.length === 0 ? (
                <EmptyMessage>No issues assigned. Enjoy the calm.</EmptyMessage>
              ) : (
                myAssigned.map((i) => (
                  <IssueRow key={i.id} issue={i} onClick={handleOpen} showProject />
                ))
              )}
            </CardContent>
          </Card>

          {dueSoon.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Due soon</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Assigned to you — next 7 days or overdue
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {dueSoon.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setOpenIssueId(i.id)}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted cursor-pointer"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{i.key}</span>
                    <span className="flex-1 truncate text-sm">{i.summary}</span>
                    <Badge
                      variant={isOverdue(i) ? 'destructive' : 'outline'}
                      className="text-[10px]"
                    >
                      {formatDueDate(i.dueDate)}
                    </Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {whatChanged.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">What changed</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Recent updates on issues you follow
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {whatChanged.map(({ activity: a, issue: i }) => {
                  const actor = members.find((m) => m.id === a.actorId);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setOpenIssueId(i.id)}
                      className="flex w-full flex-col gap-0.5 rounded-md p-2 text-left transition-colors hover:bg-muted cursor-pointer sm:flex-row sm:items-center sm:gap-3"
                    >
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{i.key}</span>
                      <span className="flex-1 truncate text-sm">{a.message}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {actor?.name.split(' ')[0] ?? 'Someone'} · {timeAgo(a.createdAt)}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Watching</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Open issues you follow (excluding assigned/reported)
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {myWatching.length === 0 ? (
                  <EmptyMessage>Watch issues from the issue panel to see them here.</EmptyMessage>
                ) : (
                  myWatching.map((i) => (
                    <IssueRow key={i.id} issue={i} onClick={handleOpen} showProject />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Reported by me</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">Issues you&apos;ve created</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {myReported.length === 0 ? (
                  <EmptyMessage>You haven&apos;t reported any issues yet.</EmptyMessage>
                ) : (
                  myReported.map((i) => (
                    <IssueRow key={i.id} issue={i} onClick={handleOpen} showProject />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recently updated</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Across all projects
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentlyUpdated.map((i) => {
                  const project = projects.find((p) => p.id === i.projectId);
                  const assignee = i.assigneeId ? members.find((m) => m.id === i.assigneeId) : undefined;
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setOpenIssueId(i.id)}
                      className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted cursor-pointer"
                    >
                      <span className="font-mono text-xs text-muted-foreground">{i.key}</span>
                      <span className="flex-1 truncate text-sm">{i.summary}</span>
                      <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[i.status]}</Badge>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(i.updatedAt)}</span>
                      {project && <span className="text-[11px] text-muted-foreground">· {project.key}</span>}
                      {assignee && <span className="text-[11px] text-muted-foreground">· {assignee.name.split(' ')[0]}</span>}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Pinned projects */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Your projects</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer gap-1.5 text-xs"
                render={<Link href="/projects" />}
              >
                Browse all
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => {
                  const projectIssues = issues.filter((i) => i.projectId === p.id);
                  const open = projectIssues.filter((i) => i.status !== 'done').length;
                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.key}`}
                      className="group rounded-lg border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                          {p.key}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate group-hover:text-primary transition-colors">
                            {p.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {open} open · {projectIssues.length} total
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className={`text-3xl font-bold leading-none ${accent ?? ''}`}>{value}</p>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-20 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {children}
    </div>
  );
}
