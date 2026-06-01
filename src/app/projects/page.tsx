'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { UserAvatar } from '@/components/issue/user-avatar';

export default function ProjectsPage() {
  const projects = useProjectsStore((s) => s.projects);
  const members = useProjectsStore((s) => s.members);
  const createProject = useProjectsStore((s) => s.createProject);
  const issues = useIssuesStore((s) => s.issues);
  const user = useAuthStore((s) => s.user);

  const canCreate = hasPermission(user?.role, 'projects.create');

  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState(user?.id ?? '');
  const [error, setError] = useState('');

  const submitCreate = () => {
    setError('');
    if (!name.trim()) return setError('Name is required');
    if (!/^[A-Z][A-Z0-9]{1,7}$/i.test(key)) {
      return setError('Key must be 2–8 alphanumerics, starting with a letter');
    }
    if (projects.some((p) => p.key.toUpperCase() === key.toUpperCase())) {
      return setError('A project with that key already exists');
    }
    if (!leadId) return setError('Pick a lead');

    const created = createProject({
      key: key.toUpperCase(),
      name: name.trim(),
      description: description.trim() || undefined,
      leadId,
    });
    setOpen(false);
    setKey('');
    setName('');
    setDescription('');
    setLeadId(user?.id ?? '');
    // Optionally we could navigate to the new project's board
    return created;
  };

  return (
    <>
      <AppHeader
        title="Projects"
        description="Browse all projects in your workspace"
        actions={
          canCreate ? (
            <Button size="sm" className="cursor-pointer gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New project
            </Button>
          ) : null
        }
      />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const lead = members.find((m) => m.id === p.leadId);
              const projectIssues = issues.filter((i) => i.projectId === p.id);
              const open = projectIssues.filter((i) => i.status !== 'done').length;
              const inProgress = projectIssues.filter((i) => i.status === 'in-progress').length;

              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.key}`}
                  className="group block rounded-lg border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                      {p.key}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate group-hover:text-primary transition-colors">
                        {p.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {p.description ?? 'No description'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <UserAvatar member={lead} size="sm" />
                    <span className="text-[11px] text-muted-foreground">
                      Lead · {lead?.name ?? '—'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                    <Stat label="Total" value={projectIssues.length} />
                    <Stat label="Open" value={open} />
                    <Stat label="WIP" value={inProgress} />
                  </div>
                </Link>
              );
            })}

            {projects.length === 0 && (
              <Card className="sm:col-span-2 lg:col-span-3">
                <CardContent className="p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No projects yet. {canCreate ? 'Create the first one.' : 'Ask an admin to create one.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {canCreate && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>Create a workspace for tracking related work.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing Website" autoFocus />
              </Field>
              <Field label="Key (used in issue keys, e.g. WEB-123)">
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder="WEB"
                  maxLength={8}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  rows={3}
                />
              </Field>
              <Field label="Lead">
                <Select value={leadId} onValueChange={(v) => v && setLeadId(v)}>
                  <SelectTrigger><SelectValue placeholder="Pick a lead" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="cursor-pointer" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="cursor-pointer" onClick={submitCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium">{label}</div>
      {children}
    </div>
  );
}
