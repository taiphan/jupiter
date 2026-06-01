'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useProjectsStore } from '@/lib/projects-store';
import { useIssuesStore } from '@/lib/issues-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import { UserAvatar } from '@/components/issue/user-avatar';

export function SettingsView({ projectKey }: { projectKey: string }) {
  const router = useRouter();
  const project = useProjectsStore((s) => s.getProjectByKey(projectKey));
  const members = useProjectsStore((s) => s.members);
  const updateProject = useProjectsStore((s) => s.updateProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const projectIssues = useIssuesStore((s) => project ? s.issues.filter((i) => i.projectId === project.id) : []);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState('');

  useEffect(() => {
    if (project) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form state when project id changes
      setName(project.name);
      setDescription(project.description ?? '');
      setLeadId(project.leadId);
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null;

  const canEdit = hasPermission(user?.role, 'projects.edit');
  const canDelete = hasPermission(user?.role, 'projects.delete');

  const dirty =
    name !== project.name ||
    (description ?? '') !== (project.description ?? '') ||
    leadId !== project.leadId;

  const save = () => {
    updateProject(project.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      leadId,
      memberIds: Array.from(new Set([leadId, ...project.memberIds])),
    });
  };

  const toggleMember = (memberId: string) => {
    if (memberId === project.leadId) return; // can't remove lead
    const has = project.memberIds.includes(memberId);
    updateProject(project.id, {
      memberIds: has
        ? project.memberIds.filter((id) => id !== memberId)
        : [...project.memberIds, memberId],
    });
  };

  const handleDelete = () => {
    if (confirm(`Delete project "${project.name}"? This removes ${projectIssues.length} issues. This can&apos;t be undone.`)) {
      deleteProject(project.id);
      router.replace('/projects');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Project name, description, and key.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Key">
            <Input value={project.key} disabled className="font-mono" />
            <p className="mt-1 text-[11px] text-muted-foreground">Project keys can&apos;t be changed.</p>
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Lead">
            <Select value={leadId} onValueChange={(v) => v && setLeadId(v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {canEdit && (
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="ghost"
                className="cursor-pointer"
                disabled={!dirty}
                onClick={() => {
                  setName(project.name);
                  setDescription(project.description ?? '');
                  setLeadId(project.leadId);
                }}
              >
                Reset
              </Button>
              <Button className="cursor-pointer" disabled={!dirty} onClick={save}>
                Save changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>Toggle who has access to this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => {
            const isMember = project.memberIds.includes(m.id);
            const isLead = project.leadId === m.id;
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-md border p-3">
                <UserAvatar member={m} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                </div>
                {isLead && <Badge variant="outline" className="text-[10px]">Lead</Badge>}
                {!isLead && canEdit && (
                  <Button
                    size="sm"
                    variant={isMember ? 'outline' : 'default'}
                    className="cursor-pointer"
                    onClick={() => toggleMember(m.id)}
                  >
                    {isMember ? 'Remove' : 'Add'}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canDelete && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
            <CardDescription>Deleting a project removes its issues and history.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="cursor-pointer gap-2 text-destructive hover:bg-destructive/10 border-destructive/40"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete project
            </Button>
          </CardContent>
        </Card>
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
