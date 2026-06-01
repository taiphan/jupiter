'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Settings as SettingsIcon } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProjectsStore } from '@/lib/projects-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';

interface ProjectShellProps {
  projectKey: string;
  children: React.ReactNode;
}

const TABS = [
  { label: 'Board', sub: '' },
  { label: 'Backlog', sub: 'backlog' },
  { label: 'Settings', sub: 'settings' },
];

export function ProjectShell({ projectKey, children }: ProjectShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const user = useAuthStore((s) => s.user);

  // Redirect to projects list if the project doesn't exist (e.g. deleted)
  useEffect(() => {
    if (!project) router.replace('/projects');
  }, [project, router]);

  if (!project) return null;

  const canCreate = hasPermission(user?.role, 'issues.create');
  const canEdit = hasPermission(user?.role, 'projects.edit');

  const baseUrl = `/projects/${project.key}`;
  const currentTab = pathname === baseUrl
    ? 'Board'
    : pathname.startsWith(`${baseUrl}/backlog`) ? 'Backlog'
    : pathname.startsWith(`${baseUrl}/settings`) ? 'Settings' : 'Board';

  return (
    <>
      <AppHeader
        title={project.name}
        description={`${project.key} · ${project.type === 'kanban' ? 'Kanban' : 'Scrum'}`}
        actions={
          <>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                aria-label="Project settings"
                render={<Link href={`${baseUrl}/settings`} />}
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
            )}
            {canCreate && (
              <Button
                size="sm"
                className="cursor-pointer gap-1.5"
                render={<Link href={`/issues/new?project=${project.id}`} />}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                New issue
              </Button>
            )}
          </>
        }
      />

      <div className="border-b bg-card px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-1 -mb-px">
          {TABS.filter((t) => t.label !== 'Settings' || canEdit).map((t) => {
            const href = t.sub ? `${baseUrl}/${t.sub}` : baseUrl;
            const active = currentTab === t.label;
            return (
              <Link
                key={t.label}
                href={href}
                className={[
                  'border-b-2 px-3 py-2.5 text-sm transition-colors',
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
      </div>

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-4">
          {project.description && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}
          {children}
        </div>
      </main>
    </>
  );
}
