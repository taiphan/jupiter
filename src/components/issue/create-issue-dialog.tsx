'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIssuesStore } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useAuthStore } from '@/lib/auth-store';
import {
  ISSUE_TYPES, ISSUE_TYPE_LABELS,
  PRIORITIES, PRIORITY_LABELS,
  STATUSES, STATUS_LABELS,
} from '@/lib/types';
import type { IssueStatus, IssueType, Priority } from '@/lib/types';
import { IssueTypeIcon } from './issue-icon';
import { PriorityIcon } from './priority-icon';

interface CreateIssueDialogProps {
  open: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  defaultStatus?: IssueStatus;
  defaultDueDate?: string;
  /** Called with the new issue id after creation. */
  onCreated?: (id: string) => void;
}

export function CreateIssueDialog({
  open, onClose, defaultProjectId, defaultStatus = 'todo', defaultDueDate, onCreated,
}: CreateIssueDialogProps) {
  const projects = useProjectsStore((s) => s.projects);
  const members = useProjectsStore((s) => s.members);
  const createIssue = useIssuesStore((s) => s.createIssue);
  const user = useAuthStore((s) => s.user);

  const [projectId, setProjectId] = useState<string>('');
  const [type, setType] = useState<IssueType>('task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<IssueStatus>(defaultStatus);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('__unassigned');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting form state when the dialog re-opens
    setProjectId(defaultProjectId ?? projects[0]?.id ?? '');
    setStatus(defaultStatus);
    setType('task');
    setPriority('medium');
    setSummary('');
    setDescription('');
    setAssigneeId('__unassigned');
    setDueDate(defaultDueDate ?? '');
    setError('');
  }, [open, defaultProjectId, defaultStatus, defaultDueDate, projects]);

  if (!user) return null;

  const project = projects.find((p) => p.id === projectId);
  const projectMembers = project ? members.filter((m) => project.memberIds.includes(m.id)) : members;

  const submit = () => {
    if (!summary.trim()) {
      setError('Summary is required');
      return;
    }
    if (!projectId) {
      setError('Pick a project');
      return;
    }
    const issue = createIssue({
      projectId,
      type,
      summary: summary.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      assigneeId: assigneeId === '__unassigned' ? undefined : assigneeId,
      reporterId: user.id,
      dueDate: dueDate || undefined,
    });
    onCreated?.(issue.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create issue</DialogTitle>
          <DialogDescription>Capture a unit of work for your team.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Field label="Project">
            <Select value={projectId} onValueChange={(v) => v && setProjectId(v)}>
              <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.key} · {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type">
              <Select value={type} onValueChange={(v) => v && setType(v as IssueType)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <IssueTypeIcon type={type} />
                    <span>{ISSUE_TYPE_LABELS[type]}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <div className="flex items-center gap-2">
                        <IssueTypeIcon type={t} />
                        {ISSUE_TYPE_LABELS[t]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Priority">
              <Select value={priority} onValueChange={(v) => v && setPriority(v as Priority)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <PriorityIcon priority={priority} />
                    <span>{PRIORITY_LABELS[priority]}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <PriorityIcon priority={p} />
                        {PRIORITY_LABELS[p]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status">
              <Select value={status} onValueChange={(v) => v && setStatus(v as IssueStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Summary">
            <Input
              autoFocus
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Short, descriptive title"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — what does &quot;done&quot; look like?"
              rows={4}
            />
          </Field>

          <Field label="Due date">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>

          <Field label="Assignee">
            <Select value={assigneeId} onValueChange={(v) => v && setAssigneeId(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned">Unassigned</SelectItem>
                {projectMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={onClose}>Cancel</Button>
          <Button className="cursor-pointer" onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
