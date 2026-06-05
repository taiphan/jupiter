'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Rocket, Package } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/projects-store';
import { useVersionsStore } from '@/lib/versions-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { IssueDialog } from '@/components/issue/issue-dialog';
import { IssueTypeIcon } from '@/components/issue/issue-icon';
import type { ProjectVersion } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ReleasesView({ projectKey }: { projectKey: string }) {
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const versions = useVersionsStore((s) =>
    project ? s.getVersionsForProject(project.id) : [],
  );
  const allIssues = useIssuesStore((s) => s.issues);
  const createVersion = useVersionsStore((s) => s.createVersion);
  const deleteVersion = useVersionsStore((s) => s.deleteVersion);
  const markReleased = useVersionsStore((s) => s.markReleased);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [error, setError] = useState('');
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canEdit = hasPermission(user?.role, 'projects.edit');

  const issuesByVersion = useMemo(() => {
    const map = new Map<string, typeof allIssues>();
    if (!project) return map;
    for (const v of versions) {
      map.set(
        v.id,
        allIssues.filter(
          (i) => i.projectId === project.id && (i.fixVersionIds ?? []).includes(v.id),
        ),
      );
    }
    return map;
  }, [allIssues, project, versions]);

  if (!project) return null;

  const submit = () => {
    setError('');
    if (!name.trim()) return setError('Version name is required');
    createVersion({
      projectId: project.id,
      name: name.trim(),
      description: description.trim() || undefined,
      releaseDate: releaseDate || undefined,
    });
    setName('');
    setDescription('');
    setReleaseDate('');
  };

  const unreleased = versions.filter((v) => !v.released);
  const released = versions.filter((v) => v.released);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Fix versions & releases
          </CardTitle>
          <CardDescription>
            Plan releases for {project.name}. Assign fix versions on issues to track what ships in each release.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {versions.length === 0 ? (
            <div className="flex h-16 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No versions yet. Create one below.
            </div>
          ) : (
            <>
              {unreleased.length > 0 && (
                <VersionSection
                  title="Unreleased"
                  versions={unreleased}
                  issuesByVersion={issuesByVersion}
                  expandedId={expandedId}
                  onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                  onOpenIssue={setOpenIssueId}
                  canEdit={canEdit}
                  onRelease={markReleased}
                  onDelete={deleteVersion}
                />
              )}
              {released.length > 0 && (
                <VersionSection
                  title="Released"
                  versions={released}
                  issuesByVersion={issuesByVersion}
                  expandedId={expandedId}
                  onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                  onOpenIssue={setOpenIssueId}
                  canEdit={canEdit}
                  onRelease={markReleased}
                  onDelete={deleteVersion}
                  released
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Version name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 1.2.0" />
              </Field>
              <Field label="Target date">
                <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
              </Field>
              <Field label="Description">
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button className="cursor-pointer gap-1.5" onClick={submit}>
                <Plus className="h-3.5 w-3.5" />
                Create version
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <IssueDialog issueId={openIssueId} onClose={() => setOpenIssueId(null)} />
    </div>
  );
}

function VersionSection({
  title, versions, issuesByVersion, expandedId, onToggleExpand, onOpenIssue,
  canEdit, onRelease, onDelete, released = false,
}: {
  title: string;
  versions: ProjectVersion[];
  issuesByVersion: Map<string, ReturnType<typeof useIssuesStore.getState>['issues']>;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onOpenIssue: (id: string) => void;
  canEdit: boolean;
  onRelease: (id: string) => void;
  onDelete: (id: string) => void;
  released?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="space-y-2">
        {versions.map((v) => {
          const issues = issuesByVersion.get(v.id) ?? [];
          const expanded = expandedId === v.id;
          return (
            <li key={v.id} className="rounded-md border bg-card">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => onToggleExpand(v.id)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{v.name}</span>
                    <Badge variant={released ? 'secondary' : 'outline'} className="text-[10px]">
                      {released ? 'Released' : 'Unreleased'}
                    </Badge>
                    {v.releaseDate && (
                      <span className="text-xs text-muted-foreground">{v.releaseDate}</span>
                    )}
                  </div>
                  {v.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{v.description}</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                  </p>
                </button>
                {canEdit && !released && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5 h-7 text-xs"
                    onClick={() => onRelease(v.id)}
                  >
                    <Rocket className="h-3 w-3" />
                    Release
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete version "${v.name}"? Issues keep their other versions.`)) {
                        onDelete(v.id);
                      }
                    }}
                    aria-label="Delete version"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {expanded && issues.length > 0 && (
                <ul className="border-t divide-y">
                  {issues.map((issue) => (
                    <li key={issue.id}>
                      <button
                        type="button"
                        onClick={() => onOpenIssue(issue.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50 cursor-pointer"
                      >
                        <IssueTypeIcon type={issue.type} />
                        <span className="font-mono text-primary">{issue.key}</span>
                        <span className="flex-1 truncate">{issue.summary}</span>
                        <Badge variant="outline" className={cn('text-[10px]')}>{issue.status}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium">{label}</div>
      {children}
    </div>
  );
}
