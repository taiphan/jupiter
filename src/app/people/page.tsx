'use client';

import { useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useAuthStore, DEMO_USERS } from '@/lib/auth-store';
import { ROLE_LABELS } from '@/lib/permissions';
import { UserAvatar } from '@/components/issue/user-avatar';

export default function PeoplePage() {
  const members = useProjectsStore((s) => s.members);
  const projects = useProjectsStore((s) => s.projects);
  const issues = useIssuesStore((s) => s.issues);
  const user = useAuthStore((s) => s.user);

  const memberStats = useMemo(
    () =>
      members.map((m) => {
        const role = DEMO_USERS.find((u) => u.user.id === m.id)?.user.role;
        const assigned = issues.filter((i) => i.assigneeId === m.id);
        const open = assigned.filter((i) => i.status !== 'done').length;
        const inProgress = assigned.filter((i) => i.status === 'in-progress').length;
        const projectsLed = projects.filter((p) => p.leadId === m.id).length;
        return { ...m, role, assigned: assigned.length, open, inProgress, projectsLed };
      }),
    [members, issues, projects],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Teams"
        description={`${members.length} members in this workspace`}
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberStats.map((m) => (
              <Card key={m.id} className={m.id === user?.id ? 'ring-2 ring-primary/40' : ''}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <UserAvatar member={m} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                    </div>
                    {m.role && (
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[m.role]}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                    <Stat label="Assigned" value={m.assigned} />
                    <Stat label="Open" value={m.open} />
                    <Stat label="WIP" value={m.inProgress} />
                  </div>

                  {m.projectsLed > 0 && (
                    <p className="mt-3 text-center text-[11px] text-muted-foreground">
                      Leads {m.projectsLed} {m.projectsLed === 1 ? 'project' : 'projects'}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-base font-bold leading-none">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
