'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Star, Share2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjectsStore } from '@/lib/projects-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { ProjectSidebar } from '@/components/layout/project-sidebar';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';
import { IssueDialog } from '@/components/issue/issue-dialog';

interface ProjectShellProps {
  projectKey: string;
  children: React.ReactNode;
}

const TABS: Array<{ label: string; sub: string }> = [
  { label: 'Summary', sub: 'summary' },
  { label: 'Board', sub: '' },
  { label: 'Backlog', sub: 'backlog' },
  { label: 'Timeline', sub: 'timeline' },
  { label: 'Reports', sub: 'reports' },
];

export function ProjectShell({ projectKey, children }: ProjectShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const user = useAuthStore((s) => s.user);

  const [createOpen, setCreateOpen] = useState(false);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    if (!project) router.replace('/projects');
  }, [project, router]);

  if (!project) return null;

  const canCreate = hasPermission(user?.role, 'issues.create');
  const canEdit = hasPermission(user?.role, 'projects.edit');

  const baseUrl = `/projects/${project.key}`;
  const currentTabSub =
    pathname === baseUrl
      ? ''
      : pathname.startsWith(`${baseUrl}/summary`) ? 'summary'
      : pathname.startsWith(`${baseUrl}/backlog`) ? 'backlog'
      : pathname.startsWith(`${baseUrl}/timeline`) ? 'timeline'
      : pathname.startsWith(`${baseUrl}/reports`) ? 'reports'
      : pathname.startsWith(`${baseUrl}/board-config`) ? 'board-config'
      : pathname.startsWith(`${baseUrl}/settings`) ? 'settings'
      : '';

  const showTabs = currentTabSub !== 'settings' && currentTabSub !== 'board-config';

  return (
    <>
      <ProjectSidebar project={project} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Project page header */}
        <div className="border-b bg-card px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl pt-3">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link href="/projects" className="hover:text-foreground">Projects</Link>
              <span>/</span>
              <span className="font-medium text-foreground">{project.name}</span>
            </div>

            {/* Title row */}
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="truncate text-xl font-semibold leading-tight tracking-tight">
                  {currentTabSub === 'settings'
                    ? 'Project settings'
                    : currentTabSub === 'board-config' ? 'Board configuration'
                    : currentTabSub === 'summary' ? 'Summary'
                    : currentTabSub === 'backlog' ? 'Backlog'
                    : currentTabSub === 'timeline' ? 'Timeline'
                    : currentTabSub === 'reports' ? 'Reports'
                    : 'Board'}
                </h1>
                <button
                  type="button"
                  onClick={() => setStarred((s) => !s)}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Star project"
                >
                  <Star className={`h-4 w-4 ${starred ? 'fill-yellow-400 text-yellow-500' : ''}`} />
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1.5"
                  aria-label="Share"
                >
                  <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Share
                </Button>
                {canCreate && (
                  <Button
                    size="sm"
                    className="cursor-pointer gap-1.5"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Create
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <>
                        <DropdownMenuItem className="cursor-pointer" render={<Link href={`${baseUrl}/board-config`} />}>
                          Configure board
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" render={<Link href={`${baseUrl}/settings`} />}>
                          Project settings
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Tabs */}
            {showTabs && (
              <div className="-mb-px flex items-center gap-1 overflow-x-auto">
                {TABS.map((t) => {
                  const href = t.sub ? `${baseUrl}/${t.sub}` : baseUrl;
                  const active = currentTabSub === t.sub;
                  return (
                    <Link
                      key={t.label}
                      href={href}
                      className={[
                        'border-b-2 px-3 py-2 text-sm transition-colors whitespace-nowrap',
                        active
                          ? 'border-primary font-semibold text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      ].join(' ')}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <main className="flex-1 overflow-auto bg-[var(--background)] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-4">{children}</div>
        </main>
      </div>

      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultProjectId={project.id}
        onCreated={(id) => setOpenIssueId(id)}
      />
      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
    </>
  );
}
