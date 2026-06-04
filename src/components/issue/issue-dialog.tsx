'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, X, Paperclip, Upload, FileText, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useIssuesStore, MAX_ATTACHMENT_BYTES } from '@/lib/issues-store';
import { useProjectsStore } from '@/lib/projects-store';
import { useCustomFieldsStore } from '@/lib/custom-fields-store';
import { useAuthStore } from '@/lib/auth-store';
import { hasPermission } from '@/lib/permissions';
import {
  ISSUE_TYPES, ISSUE_TYPE_LABELS,
  STATUSES, STATUS_LABELS,
  PRIORITIES, PRIORITY_LABELS,
} from '@/lib/types';
import type { Issue, IssueStatus, IssueType, Priority, CustomFieldValue } from '@/lib/types';
import { timeAgo, formatBytes } from '@/lib/utils';
import { canTransition as isWorkflowTransitionAllowed } from '@/lib/workflow-transitions';
import { formatDueDate, isOverdue } from '@/lib/derive/due-date';
import { IssueTypeIcon } from './issue-icon';
import { PriorityIcon } from './priority-icon';
import { UserAvatar } from './user-avatar';

interface IssueDialogProps {
  issueId: string | null;
  onClose: () => void;
}

export function IssueDialog({ issueId, onClose }: IssueDialogProps) {
  return (
    <Dialog open={!!issueId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {issueId && <IssueDialogBody issueId={issueId} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function IssueDialogBody({ issueId, onClose }: { issueId: string; onClose: () => void }) {
  const issue = useIssuesStore((s) => s.issues.find((i) => i.id === issueId));
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const deleteIssue = useIssuesStore((s) => s.deleteIssue);
  const addComment = useIssuesStore((s) => s.addComment);
  const getCommentsForIssue = useIssuesStore((s) => s.getCommentsForIssue);
  const getActivityForIssue = useIssuesStore((s) => s.getActivityForIssue);
  const project = useProjectsStore((s) => issue ? s.getProject(issue.projectId) : undefined);
  const members = useProjectsStore((s) => s.members);
  const user = useAuthStore((s) => s.user);

  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryValue, setSummaryValue] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [commentValue, setCommentValue] = useState('');
  const [labelValue, setLabelValue] = useState('');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  useEffect(() => {
    if (issue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form state when issue id changes
      setSummaryValue(issue.summary);
      setDescriptionValue(issue.description ?? '');
    }
  }, [issue?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!issue || !user) return null;

  const canEdit = hasPermission(user.role, 'issues.edit');
  const canDelete = hasPermission(user.role, 'issues.delete');
  const canTransition = hasPermission(user.role, 'issues.transition');
  const canComment = hasPermission(user.role, 'comments.create');

  const reporter = members.find((m) => m.id === issue.reporterId);
  const assignee = issue.assigneeId ? members.find((m) => m.id === issue.assigneeId) : undefined;
  const projectMembers = project ? members.filter((m) => project.memberIds.includes(m.id)) : members;
  const comments = getCommentsForIssue(issue.id);
  const activity = getActivityForIssue(issue.id);

  const saveSummary = () => {
    const trimmed = summaryValue.trim();
    if (trimmed && trimmed !== issue.summary) {
      updateIssue(issue.id, { summary: trimmed }, user.id);
    } else {
      setSummaryValue(issue.summary);
    }
    setEditingSummary(false);
  };

  const saveDescription = () => {
    if (descriptionValue !== (issue.description ?? '')) {
      updateIssue(issue.id, { description: descriptionValue }, user.id);
    }
    setEditingDescription(false);
  };

  const submitComment = () => {
    const trimmed = commentValue.trim();
    if (!trimmed) return;
    addComment({ issueId: issue.id, authorId: user.id, body: trimmed });
    setCommentValue('');
  };

  const addLabel = () => {
    const v = labelValue.trim().toLowerCase();
    if (!v || issue.labels.includes(v)) {
      setLabelValue('');
      return;
    }
    updateIssue(issue.id, { labels: [...issue.labels, v] }, user.id);
    setLabelValue('');
  };

  const removeLabel = (label: string) => {
    updateIssue(issue.id, { labels: issue.labels.filter((l) => l !== label) }, user.id);
  };

  const handleDelete = () => {
    if (confirm(`Delete ${issue.key}? This can&apos;t be undone.`)) {
      deleteIssue(issue.id);
      onClose();
    }
  };

  return (
    <>
      {/* Header */}
      <DialogHeader className="border-b px-6 py-3 flex flex-row items-center gap-3 space-y-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <IssueTypeIcon type={issue.type} />
          <span className="font-mono">{issue.key}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer gap-1.5 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <DialogTitle className="sr-only">{issue.summary}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-6 p-6 md:grid-cols-[1fr_240px]">
        {/* Main column */}
        <div className="space-y-6 min-w-0">
          {editingSummary ? (
            <div className="space-y-2">
              <Input
                value={summaryValue}
                onChange={(e) => setSummaryValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveSummary();
                  if (e.key === 'Escape') {
                    setSummaryValue(issue.summary);
                    setEditingSummary(false);
                  }
                }}
                autoFocus
                className="text-lg font-semibold"
              />
              <div className="flex gap-2">
                <Button size="sm" className="cursor-pointer" onClick={saveSummary}>Save</Button>
                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => {
                  setSummaryValue(issue.summary);
                  setEditingSummary(false);
                }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <h2
              className={`text-lg font-semibold leading-snug ${canEdit ? 'cursor-pointer rounded -mx-2 px-2 py-1 hover:bg-muted' : ''}`}
              onClick={() => canEdit && setEditingSummary(true)}
            >
              {issue.summary}
            </h2>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </h3>
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  rows={6}
                  autoFocus
                  placeholder="Add a description..."
                />
                <div className="flex gap-2">
                  <Button size="sm" className="cursor-pointer" onClick={saveDescription}>Save</Button>
                  <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => {
                    setDescriptionValue(issue.description ?? '');
                    setEditingDescription(false);
                  }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-md text-sm whitespace-pre-wrap ${canEdit ? 'cursor-pointer p-3 hover:bg-muted' : 'p-3'} ${!issue.description ? 'text-muted-foreground italic' : ''}`}
                onClick={() => canEdit && setEditingDescription(true)}
              >
                {issue.description || 'Add a description...'}
              </div>
            )}
          </div>

          {/* Attachments */}
          <AttachmentsSection issueId={issue.id} canEdit={canEdit} uploadedById={user.id} />

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Activity
            </h3>

            {canComment && (
              <div className="flex gap-3">
                <UserAvatar member={members.find((m) => m.id === user.id)} size="md" />
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentValue}
                    onChange={(e) => setCommentValue(e.target.value)}
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment();
                    }}
                  />
                  {commentValue.trim() && (
                    <div className="flex gap-2">
                      <Button size="sm" className="cursor-pointer" onClick={submitComment}>Save</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => setCommentValue('')}
                      >
                        Cancel
                      </Button>
                      <span className="text-[11px] text-muted-foreground self-center">⌘+Enter</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {comments.map((c) => {
                const author = members.find((m) => m.id === c.authorId);
                return (
                  <div key={c.id} className="flex gap-3">
                    <UserAvatar member={author} size="md" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold">{author?.name ?? 'Unknown'}</span>
                        <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                );
              })}

              {activity.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                  {activity.slice(-6).reverse().map((a) => {
                    const actor = members.find((m) => m.id === a.actorId);
                    return (
                      <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <UserAvatar member={actor} size="sm" />
                        <span className="font-medium text-foreground">{actor?.name}</span>
                        <span>·</span>
                        <span>{a.message}</span>
                        <span className="ml-auto">{timeAgo(a.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — fields */}
        <div className="space-y-4 text-sm">
          <FieldRow label="Status">
            <Select
              disabled={!canTransition}
              value={issue.status}
              onValueChange={(v) => {
                if (!v) return;
                const next = v as IssueStatus;
                if (!isWorkflowTransitionAllowed(user.role, issue.status, next, project)) {
                  setTransitionError('Transition not allowed for your role.');
                  return;
                }
                setTransitionError(null);
                updateIssue(issue.id, { status: next }, user.id);
              }}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {transitionError && (
              <p className="mt-1 text-[11px] text-destructive">{transitionError}</p>
            )}
          </FieldRow>

          <FieldRow label="Assignee">
            <Select
              disabled={!canEdit}
              value={issue.assigneeId ?? '__unassigned'}
              onValueChange={(v) => updateIssue(issue.id, {
                assigneeId: !v || v === '__unassigned' ? undefined : v,
              }, user.id)}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Assignee">
                <div className="flex items-center gap-2 truncate">
                  <UserAvatar member={assignee} size="sm" />
                  <span className="truncate">{assignee?.name ?? 'Unassigned'}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned">Unassigned</SelectItem>
                {projectMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Reporter">
            <div className="flex items-center gap-2">
              <UserAvatar member={reporter} size="sm" />
              <span className="text-xs">{reporter?.name ?? 'Unknown'}</span>
            </div>
          </FieldRow>

          <Separator />

          <FieldRow label="Type">
            <Select
              disabled={!canEdit}
              value={issue.type}
              onValueChange={(v) => v && updateIssue(issue.id, { type: v as IssueType }, user.id)}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Type">
                <div className="flex items-center gap-2">
                  <IssueTypeIcon type={issue.type} />
                  <span>{ISSUE_TYPE_LABELS[issue.type]}</span>
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
          </FieldRow>

          <FieldRow label="Priority">
            <Select
              disabled={!canEdit}
              value={issue.priority}
              onValueChange={(v) => v && updateIssue(issue.id, { priority: v as Priority }, user.id)}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Priority">
                <div className="flex items-center gap-2">
                  <PriorityIcon priority={issue.priority} />
                  <span>{PRIORITY_LABELS[issue.priority]}</span>
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
          </FieldRow>

          <FieldRow label="Sprint">
            <SprintSelect
              issueId={issue.id}
              projectId={issue.projectId}
              currentSprintId={issue.sprintId}
              disabled={!canEdit}
            />
          </FieldRow>

          <FieldRow label="Story points">
            {canEdit ? (
              <Input
                type="number"
                min={0}
                value={issue.storyPoints ?? ''}
                onChange={(e) => {
                  const n = e.target.value === '' ? undefined : Number(e.target.value);
                  updateIssue(issue.id, { storyPoints: n }, user.id);
                }}
                className="h-8 text-xs"
                placeholder="—"
              />
            ) : (
              <span className="text-xs">{issue.storyPoints ?? '—'}</span>
            )}
          </FieldRow>

          <FieldRow label="Due date">
            {canEdit ? (
              <Input
                type="date"
                value={issue.dueDate ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  updateIssue(issue.id, { dueDate: v || undefined }, user.id);
                }}
                className="h-8 text-xs"
              />
            ) : (
              <span className={`text-xs ${isOverdue(issue) ? 'font-medium text-destructive' : ''}`}>
                {formatDueDate(issue.dueDate)}
                {isOverdue(issue) ? ' · Overdue' : ''}
              </span>
            )}
          </FieldRow>

          <FieldRow label="Labels">
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1">
                {issue.labels.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
                {issue.labels.map((l) => (
                  <Badge key={l} variant="secondary" className="gap-1 pr-1 text-[10px]">
                    {l}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeLabel(l)}
                        className="ml-1 rounded-sm hover:bg-foreground/10"
                        aria-label={`Remove ${l}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {canEdit && (
                <Input
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLabel();
                    }
                  }}
                  onBlur={addLabel}
                  placeholder="Add label…"
                  className="h-7 text-xs"
                />
              )}
            </div>
          </FieldRow>

          <CustomFieldsEditor issue={issue} canEdit={canEdit} actorId={user.id} />

          <Separator />

          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div>Created {timeAgo(issue.createdAt)}</div>
            <div>Updated {timeAgo(issue.updatedAt)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

import { useSprintsStore } from '@/lib/sprints-store';

function SprintSelect({
  issueId, projectId, currentSprintId, disabled,
}: {
  issueId: string;
  projectId: string;
  currentSprintId?: string;
  disabled?: boolean;
}) {
  const getSprintsByProject = useSprintsStore((s) => s.getSprintsByProject);
  const sprints = getSprintsByProject(projectId);
  const updateIssue = useIssuesStore((s) => s.updateIssue);
  const user = useAuthStore((s) => s.user);

  const value = currentSprintId ?? '__none';
  const visibleSprints = sprints.filter((s) => s.state !== 'completed');

  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(v) => {
        if (!user) return;
        updateIssue(issueId, { sprintId: !v || v === '__none' ? undefined : v }, user.id);
      }}
    >
      <SelectTrigger className="h-8 text-xs" aria-label="Sprint">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">Backlog (no sprint)</SelectItem>
        {visibleSprints.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name} {s.state === 'active' ? '· Active' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Custom fields ──────────────────────────────────────────────────────────

function CustomFieldsEditor({
  issue, canEdit, actorId,
}: {
  issue: Issue;
  canEdit: boolean;
  actorId: string;
}) {
  const getFieldsForProject = useCustomFieldsStore((s) => s.getFieldsForProject);
  const fields = getFieldsForProject(issue.projectId);
  const updateIssue = useIssuesStore((s) => s.updateIssue);

  if (fields.length === 0) return null;

  const setValue = (fieldId: string, value: CustomFieldValue) => {
    const next = { ...(issue.customFields ?? {}) };
    if (value === undefined || value === '') delete next[fieldId];
    else next[fieldId] = value;
    updateIssue(issue.id, { customFields: next }, actorId);
  };

  return (
    <>
      <Separator />
      <div className="space-y-3">
        {fields.map((f) => {
          const value = issue.customFields?.[f.id];
          return (
            <FieldRow key={f.id} label={f.name}>
              {!canEdit ? (
                <span className="text-xs">
                  {value === undefined || value === ''
                    ? '—'
                    : typeof value === 'boolean'
                      ? (value ? 'Yes' : 'No')
                      : String(value)}
                </span>
              ) : f.type === 'select' ? (
                <Select
                  value={(value as string) ?? '__none'}
                  onValueChange={(v) => setValue(f.id, !v || v === '__none' ? undefined : v)}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {(f.options ?? []).map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === 'checkbox' ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => setValue(f.id, e.target.checked)}
                  />
                  {value ? 'Yes' : 'No'}
                </label>
              ) : (
                <Input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'}
                  value={value === undefined ? '' : String(value)}
                  onChange={(e) =>
                    setValue(f.id, f.type === 'number'
                      ? (e.target.value === '' ? undefined : Number(e.target.value))
                      : e.target.value)
                  }
                  className="h-8 text-xs"
                  placeholder="—"
                />
              )}
            </FieldRow>
          );
        })}
      </div>
    </>
  );
}

// ─── Attachments ────────────────────────────────────────────────────────────

function AttachmentsSection({
  issueId, canEdit, uploadedById,
}: {
  issueId: string;
  canEdit: boolean;
  uploadedById: string;
}) {
  const getAttachmentsForIssue = useIssuesStore((s) => s.getAttachmentsForIssue);
  const attachments = getAttachmentsForIssue(issueId);
  const addAttachment = useIssuesStore((s) => s.addAttachment);
  const deleteAttachment = useIssuesStore((s) => s.deleteAttachment);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setError('');
    Array.from(files).forEach((file) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`"${file.name}" is too large (max ${formatBytes(MAX_ATTACHMENT_BYTES)})`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = addAttachment({
          issueId,
          name: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl: String(reader.result),
          uploadedById,
        });
        if (!result) setError(`"${file.name}" exceeds the size cap`);
      };
      reader.readAsDataURL(file);
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const isImage = (mime: string) => mime.startsWith('image/');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments {attachments.length > 0 && `(${attachments.length})`}
        </h3>
        {canEdit && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Add
            </Button>
          </>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">{error}</p>
      )}

      {attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No attachments</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((att) => (
            <div key={att.id} className="group relative overflow-hidden rounded-md border">
              {isImage(att.mime) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={att.dataUrl} alt={att.name} className="h-24 w-full object-cover" />
              ) : (
                <div className="flex h-24 w-full items-center justify-center bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
              <div className="p-2">
                <p className="truncate text-[11px] font-medium" title={att.name}>{att.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</p>
              </div>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <a
                  href={att.dataUrl}
                  download={att.name}
                  className="rounded bg-background/90 p-1 text-foreground shadow-sm hover:bg-background"
                  aria-label={`Download ${att.name}`}
                >
                  <Download className="h-3 w-3" />
                </a>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => deleteAttachment(att.id)}
                    className="rounded bg-background/90 p-1 text-destructive shadow-sm hover:bg-background cursor-pointer"
                    aria-label={`Delete ${att.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
