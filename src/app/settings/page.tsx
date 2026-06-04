'use client';

import { useState } from 'react';
import { Database, Sparkles, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/auth-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useThemeStore } from '@/lib/theme-store';
import { hasPermission, ROLE_LABELS, getPermissionsForRole } from '@/lib/permissions';
import { ConnectedAccountsCard } from '@/components/auth/connected-accounts-card';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const issues = useIssuesStore((s) => s.issues);
  const projects = useProjectsStore((s) => s.projects);
  const reseedProjects = useProjectsStore((s) => s.reseed);
  const reseedIssues = useIssuesStore((s) => s.reseed);
  const themeMode = useThemeStore((s) => s.mode);

  const [reseeding, setReseeding] = useState(false);

  const canEdit = hasPermission(user?.role, 'settings.edit');

  const reseed = () => {
    if (!confirm('Reset all projects and issues to demo data? Local changes will be lost.')) return;
    setReseeding(true);
    reseedProjects();
    reseedIssues();
    setTimeout(() => setReseeding(false), 400);
  };

  if (!user) return null;
  const permissions = getPermissionsForRole(user.role);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader title="Settings" description="Workspace preferences and account info" />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Read-only — sourced from your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Name" value={user.name} />
              <Row label="Email" value={user.email} />
              <Row label="Username" value={user.username} mono />
              <Row label="Role" value={ROLE_LABELS[user.role]} />
              <Row label="Title" value={user.title} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your permissions</CardTitle>
              <CardDescription>What your role allows you to do</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px] font-mono">{p}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <ConnectedAccountsCard />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Theme is configured from the global header toggle</CardDescription>
            </CardHeader>
            <CardContent>
              <Row label="Theme" value={themeMode} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" aria-hidden="true" />
                Demo data
              </CardTitle>
              <CardDescription>
                All data is stored locally in your browser. Reset to seed if things drift.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Projects" value={projects.length} />
                <Stat label="Issues" value={issues.length} />
                <Stat label="Done" value={issues.filter((i) => i.status === 'done').length} />
              </div>
              {canEdit && (
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    className="cursor-pointer gap-2"
                    onClick={reseed}
                    disabled={reseeding}
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {reseeding ? 'Reseeding...' : 'Reset to demo data'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {canEdit && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Clear all data</CardTitle>
                <CardDescription>Wipes your browser&apos;s localStorage for this app</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="cursor-pointer gap-2 text-destructive hover:bg-destructive/10 border-destructive/40"
                  onClick={() => {
                    if (!confirm('Wipe local storage? You will be logged out.')) return;
                    [
                      'jupiter-projects',
                      'jupiter-issues',
                      'jupiter-sprints',
                      'jupiter-custom-fields',
                      'jupiter-notifications',
                      'jupiter-auth',
                      'jupiter-theme',
                    ].forEach((k) => localStorage.removeItem(k));
                    window.location.reload();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear local data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
