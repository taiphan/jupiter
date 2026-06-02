'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
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

    createProject({
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
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Projects"
        description={`${projects.length} ${projects.length === 1 ? 'project' : 'projects'} in your workspace`}
        actions={
          canCreate ? (
            <Button size="sm" className="cursor-pointer gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create project
            </Button>
          ) : null
        }
      />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          {/* Atlassian-style table */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-[auto_2fr_1fr_1fr_120px] items-center gap-3 border-b bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="w-6" />
                <span>Name</span>
                <span>Key</span>
                <span>Lead</span>
                <span className="text-right">Issues</span>
              </div>
              {projects.map((p) => {
                const lead = members.find((m) => m.id === p.leadId);
                const projectIssues = issues.filter((i) => i.projectId === p.id);
                const open = projectIssues.filter((i) => i.status !== 'done').length;

                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.key}`}
                    className="grid grid-cols-[auto_2fr_1fr_1fr_120px] items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); /* star toggle: no-op for now */ }}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Star project"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                        {p.key}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">{p.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {p.description ?? 'No description'}
                        </p>
                      </div>
                    </div>
                    <code className="text-xs text-muted-foreground">{p.key}</code>
                    <div className="flex items-center gap-2">
                      <UserAvatar member={lead} size="sm" />
                      <span className="truncate text-xs">{lead?.name ?? '—'}</span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-medium">{open}</span>
                      <span className="text-muted-foreground"> / {projectIssues.length}</span>
                    </div>
                  </Link>
                );
              })}
              {projects.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No projects yet. {canCreate ? 'Create the first one.' : 'Ask an admin to create one.'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {canCreate && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription>Spin up a workspace for related work.</DialogDescription>
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
